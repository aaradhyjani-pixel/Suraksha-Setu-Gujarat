"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HazardIcon from "@/components/HazardIcon";
import SeverityBadge from "@/components/SeverityBadge";
import { makeT, speechLang, timeAgo, useT, type Key, type T } from "@/lib/i18n";
import { recordHistory } from "@/lib/history";
import { CACHE_KEY, loadProfile } from "@/lib/options";
import { explainTerms } from "@/lib/glossary";
import { cacheExplanation, getCachedExplanation } from "@/lib/ai-cache";
import type { LiveAlert, Severity } from "@/lib/types";

type Data = {
  sachetOk: boolean; imdOk: boolean;
  current: { alert: LiveAlert; sources: { agency: string; severity: Severity; headline: string }[]; conflict: boolean } | null;
  action: string;
  guide: { before: string[]; after: string[] } | null;
  occupationTip: string | null;
  vulnerabilityTips: string[];
  node: { node_id: string; last_seen: string } | null;
  fetchedAt: string;
};

const EDGE: Record<Severity, string> = { Extreme: "var(--extreme)", Severe: "var(--severe)", Moderate: "var(--moderate)", Minor: "var(--minor)" };
const LOUD: Severity[] = ["Extreme", "Severe"];
const MUTE_KEY = "ss:muteAutoRead";
const hazardKey = (h: string) => (`h_${h}` as Key);

function alertTitle(d: Data, t: T) {
  if (!d.current) return t("noAlert");
  return `${t(`s_${d.current.alert.severity}`)} ${t(hazardKey(d.current.alert.hazard_type))}`;
}

function speakText(d: Data, t: T, lang: string) {
  if (!("speechSynthesis" in window)) return;
  const c = d.current;
  const text = [alertTitle(d, t), c?.alert.headline, t("whatToDo"), d.action, d.occupationTip, ...d.vulnerabilityTips].filter(Boolean).join(". ");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechLang(lang);
  speechSynthesis.speak(u);
}

async function notify(d: Data, t: T) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.ready;
  const title = `${alertTitle(d, t)}`;
  if (reg) reg.showNotification(title, { body: d.action, tag: "suraksha-alert", data: { url: "/dashboard" } });
  else new Notification(title, { body: d.action });
}

function Skeleton() {
  return (
    <main>
      <div className="skeleton line" style={{ width: "60%", height: 26 }} />
      <div className="skeleton line" style={{ width: "40%" }} />
      <div className="skeleton line" style={{ width: "45%" }} />
      <div className="skeleton block" />
      <div className="skeleton block" style={{ height: 60 }} />
    </main>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { lang, t } = useT();
  const [data, setData] = useState<Data | null>(null);
  const [placeLabel, setPlaceLabel] = useState("");
  const [offline, setOffline] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [muted, setMuted] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiState, setAiState] = useState<"" | "loading" | "unavailable">("");

  useEffect(() => setPerm("Notification" in window ? Notification.permission : "unsupported"), []);
  useEffect(() => setMuted(localStorage.getItem(MUTE_KEY) === "1"), []);
  useEffect(() => { setAiText(null); setAiState(""); setExplainOpen(false); setGuideOpen(false); }, [data?.current?.alert.id]);

  useEffect(() => {
    const p = loadProfile();
    if (!p || !Number.isFinite(p.lat)) return router.replace("/onboarding");
    setPlaceLabel(p.label);
    const qs = new URLSearchParams({
      lat: String(p.lat), lng: String(p.lng), district: p.district, state: p.state, label: p.label,
      occupation: p.occupation, dwelling: p.dwelling_type, vulns: p.vulnerabilities.join(","), lang: p.language,
    });
    const tr = makeT(p.language);

    const load = () =>
      fetch(`/api/dashboard?${qs}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: Data) => {
          const prev: Data | null = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
          const isNew = !!(prev && d.current && d.current.alert.id !== prev.current?.alert.id);
          if (isNew) {
            notify(d, tr);
            if (LOUD.includes(d.current!.alert.severity) && localStorage.getItem(MUTE_KEY) !== "1") speakText(d, tr, p.language);
          }
          recordHistory({
            label: p.label,
            hazard_type: d.current?.alert.hazard_type ?? null,
            severity: d.current?.alert.severity ?? null,
            headline: d.current?.alert.headline ?? null,
            source_agency: d.current?.alert.source_agency ?? null,
            action: d.action,
          });
          setData(d);
          setOffline(false);
          setServerError(false);
          localStorage.setItem(CACHE_KEY, JSON.stringify(d));
        })
        .catch(() => {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) setData(JSON.parse(cached));
          // navigator.onLine tells us whether the device itself has no network —
          // if it does, the failure is on the server's end, not "you're offline".
          if (navigator.onLine) setServerError(true); else setOffline(true);
        });

    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, [router]);

  async function enableNotifications() {
    setPerm(await Notification.requestPermission());
  }

  function readAloud() {
    if (!data) return;
    speakText(data, t, lang);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }

  async function toggleExplain() {
    if (explainOpen) return setExplainOpen(false);
    setExplainOpen(true);
    if (!c || aiText || aiState === "loading") return;
    const cached = getCachedExplanation(c.alert.id);
    if (cached) return setAiText(cached);
    setAiState("loading");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: c.alert.headline, hazard: c.alert.hazard_type, severity: c.alert.severity,
          agencies: c.sources.map((s) => s.agency), language: lang,
        }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.text) { cacheExplanation(c.alert.id, d.text); setAiText(d.text); setAiState(""); }
      else setAiState("unavailable");
    } catch {
      setAiState("unavailable");
    }
  }

  if (!data) return <Skeleton />;
  const c = data.current;
  const edge = c ? EDGE[c.alert.severity] : "var(--minor)";
  const loud = c ? LOUD.includes(c.alert.severity) : false;
  const explained = c ? explainTerms(`${c.alert.headline} ${c.sources.map((s) => s.agency).join(" ")}`) : [];

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>{placeLabel}</h1>
        <Link href="/onboarding" className="muted">{t("editProfile")}</Link>
      </div>
      <div className="status">
        <span className={`dot ${data.sachetOk && !offline ? "on" : "off"}`} />
        {t("sachetFeed")} {offline ? t("noConnection") : data.sachetOk ? t("connected") : t("cached")}
      </div>
      <div className="status">
        <span className={`dot ${data.imdOk && !offline ? "on" : "off"}`} />
        {t("imdFeed")} {offline ? t("noConnection") : data.imdOk ? t("connected") : t("cached")}
      </div>
      {data.node && (
        <div className="status"><span className="dot on" />{t("nodeSynced", { id: data.node.node_id, ago: timeAgo(data.node.last_seen, t) })}</div>
      )}

      {offline && <p className="banner">{t("offlineBanner", { ago: timeAgo(data.fetchedAt, t) })}</p>}
      {serverError && <p className="banner">{t("serverErrorBanner")}</p>}

      {c ? (
        <section className={`alert ${loud ? "pulse" : ""}`} style={{ ["--edge" as any]: edge }}>
          <SeverityBadge severity={c.alert.severity} t={t} />
          <div className="alert-head">
            <span className="icon-wrap"><HazardIcon hazard={c.alert.hazard_type} /></span>
            <p className="hazard">{t(hazardKey(c.alert.hazard_type))}</p>
          </div>
          <p style={{ margin: 0 }}>{c.alert.headline}</p>
          <ul className="sources">
            {c.sources.map((s, i) => <li key={i}>{t("says", { agency: s.agency, severity: t(`s_${s.severity}`) })}</li>)}
          </ul>
          {c.conflict && <p className="conflict">{t("conflict")}</p>}
          <p className="muted" style={{ marginTop: 10 }}>{t("issued", { ago: timeAgo(c.alert.timestamp, t) })}</p>
          {(explained.length > 0 || c) && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="link-btn" onClick={toggleExplain}>
                {explainOpen ? t("hideExplain") : t("explainSimply")}
              </button>
              {explainOpen && (
                <div className="glossary-list">
                  {aiState === "loading" && <p className="muted skeleton line" style={{ width: "80%" }} />}
                  {aiText && <p style={{ margin: "0 0 10px" }}>{aiText}</p>}
                  {aiState === "unavailable" && !aiText && explained.length === 0 && (
                    <p className="muted" style={{ margin: "0 0 10px" }}>{t("explainUnavailable")}</p>
                  )}
                  {explained.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {explained.map(([term, def], i) => <li key={i}><b>{term}:</b> {def}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="alert">
          <div className="alert-head">
            <span className="icon-wrap" style={{ ["--edge" as any]: "var(--minor)" }}><HazardIcon hazard="other" /></span>
            <p className="hazard" style={{ fontSize: 28 }}>{t("noAlert")}</p>
          </div>
          <p className="muted">{t("noAlertSub")}</p>
        </section>
      )}

      <section className="action" style={{ ["--edge" as any]: edge }}>
        <span className="muted">{t("whatToDo")}</span>
        <p>{data.action}</p>
      </section>
      {data.occupationTip && (
        <section className="action secondary">
          <span className="muted">{t("yourOccupation")}</span>
          <p>{data.occupationTip}</p>
        </section>
      )}
      {data.vulnerabilityTips.length > 0 && (
        <section className="action secondary">
          <ul style={{ margin: 0, paddingLeft: 20 }}>{data.vulnerabilityTips.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}

      {data.guide && (
        <section style={{ marginTop: 16 }}>
          <button type="button" className="link-btn" onClick={() => setGuideOpen((v) => !v)}>
            {guideOpen ? t("hideFullGuide") : t("fullPrecautions")}
          </button>
          {guideOpen && (
            <div className="guide-panel">
              <h3 className="guide-h">{t("guideBefore")}</h3>
              <ul>{data.guide.before.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3 className="guide-h">{t("guideAfter")}</h3>
              <ul>{data.guide.after.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <div className="row" style={{ marginTop: 20 }}>
        <Link href="/help" className="btn">{t("findNearestHospital")}</Link>
        <a href="tel:112" className="btn ghost">{t("call", { n: 112 })}</a>
        <button className="btn ghost" onClick={readAloud}>{t("readAloud")}</button>
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="link-btn" onClick={toggleMute}>{muted ? t("unmuteAutoRead") : t("muteAutoRead")}</button>
      </div>

      {perm !== "unsupported" && (
        <div style={{ marginTop: 12 }}>
          {perm === "default" && <button className="btn ghost block" onClick={enableNotifications}>{t("notifyOn")}</button>}
          {perm === "granted" && <p className="note">{t("notifyEnabled")}</p>}
          {perm === "denied" && <p className="note">{t("notifyBlocked")}</p>}
        </div>
      )}
    </main>
  );
}
