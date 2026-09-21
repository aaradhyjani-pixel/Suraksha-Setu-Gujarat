"use client";
import { useEffect, useState } from "react";
import HazardIcon from "@/components/HazardIcon";
import SeverityBadge from "@/components/SeverityBadge";
import SeverityTimeline from "@/components/SeverityTimeline";
import PersonalStats from "@/components/PersonalStats";
import { timeAgo, useT, type Key } from "@/lib/i18n";
import { readHistory, type HistoryEntry } from "@/lib/history";
import { CACHE_KEY } from "@/lib/options";

export default function Offline() {
  const { t } = useT();
  const [cached, setCached] = useState<any>(undefined);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setCached(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null"));
    setHistory(readHistory());
  }, []);

  if (cached === undefined) return <main />;
  return (
    <main>
      <h1>{t("offlineTitle")}</h1>
      <p className="banner">{t("offlineNote")}</p>
      {!cached ? (
        <p className="muted">{t("nothingSaved")}</p>
      ) : (
        <>
          <p className="muted">{t("lastSynced", { time: new Date(cached.fetchedAt).toLocaleString() })}</p>
          {cached.current && (
            <section className="alert">
              <SeverityBadge severity={cached.current.alert.severity} t={t} />
              <div className="alert-head">
                <span className="icon-wrap"><HazardIcon hazard={cached.current.alert.hazard_type} /></span>
                <p className="hazard">{t(`h_${cached.current.alert.hazard_type}` as Key)}</p>
              </div>
              <p style={{ margin: 0 }}>{cached.current.alert.headline}</p>
              <p className="muted">{t("from", { agency: cached.current.alert.source_agency })}</p>
            </section>
          )}
          <section className="action">
            <span className="muted">{t("whatToDo")}</span>
            <p>{cached.action}</p>
          </section>
          {cached.occupationTip && (
            <section className="action secondary"><p>{cached.occupationTip}</p></section>
          )}
          {cached.vulnerabilityTips?.length > 0 && (
            <section className="action secondary"><ul style={{ margin: 0, paddingLeft: 20 }}>{cached.vulnerabilityTips.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></section>
          )}
        </>
      )}

      <h2>{t("historyTitle")}</h2>
      <p className="muted">{t("historyNote")}</p>
      {history.length > 0 && <SeverityTimeline history={history} t={t} />}
      {history.length === 0 ? (
        <p className="muted">{t("noHistory")}</p>
      ) : (
        <ul className="list">
          {history.map((h, i) => (
            <li key={i}>
              {h.hazard_type ? (
                <>
                  <div className="row">
                    <SeverityBadge severity={h.severity!} t={t} />
                    <HazardIcon hazard={h.hazard_type} size={18} />
                    <span className="title">{t(`h_${h.hazard_type}` as Key)}</span>
                  </div>
                  <div style={{ marginTop: 6 }}>{h.headline}</div>
                  <div className="muted">{h.source_agency}, {timeAgo(h.timestamp, t)}</div>
                </>
              ) : (
                <>
                  <div className="title">{t("noAlert")}</div>
                  <div className="muted">{h.label}, {timeAgo(h.timestamp, t)}</div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {history.some((h) => h.hazard_type) && (
        <>
          <h2>{t("statsTitle")}</h2>
          <PersonalStats history={history} t={t} />
        </>
      )}

      <p className="muted" style={{ marginTop: 20 }}>{t("nodeHint")}</p>
    </main>
  );
}
