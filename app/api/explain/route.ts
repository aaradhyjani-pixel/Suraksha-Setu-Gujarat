import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LANG_NAMES: Record<string, string> = { en: "English", hi: "Hindi", gu: "Gujarati", ta: "Tamil", as: "Assamese" };

// Turns an official warning's own headline/severity/agencies into a short,
// plain-language explanation — strictly a rephrasing of what was given, not
// new advice. The model is explicitly told not to add facts, numbers, or
// instructions beyond the source text, since inventing anything here would
// be a real safety risk. Cached client-side for 5 days per alert id, so
// this is called at most once per alert per device.
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "AI explanation isn't configured" }, { status: 501 });

  const body = await req.json().catch(() => null);
  const { headline, hazard, severity, agencies, language } = body ?? {};
  if (!headline || !hazard || !severity) {
    return NextResponse.json({ error: "headline, hazard and severity are required" }, { status: 400 });
  }
  const langName = LANG_NAMES[language] ?? "English";

  const prompt = `An official disaster alert says:
Hazard: ${hazard}
Severity: ${severity}
Agencies: ${Array.isArray(agencies) ? agencies.join(", ") : agencies}
Headline: "${headline}"

Rewrite ONLY this headline in plain, simple ${langName}, 2-3 short sentences, for someone who isn't familiar with weather/disaster terminology. Explain what the official wording means in everyday terms. Do NOT add any safety instructions, numbers, locations, or facts that are not already in the headline above — only clarify the wording given. If the headline is already simple, say so briefly rather than padding it.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return NextResponse.json({ error: "AI explanation failed" }, { status: 502 });
    const data = await res.json();
    const text = data.content?.find((b: any) => b.type === "text")?.text?.trim();
    if (!text) return NextResponse.json({ error: "AI explanation failed" }, { status: 502 });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[explain] failed:", err);
    return NextResponse.json({ error: "AI explanation failed" }, { status: 502 });
  }
}
