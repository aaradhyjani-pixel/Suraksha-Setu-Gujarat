import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LANG_NAMES: Record<string, string> = { en: "English", hi: "Hindi", gu: "Gujarati", ta: "Tamil", as: "Assamese" };

function buildPrompt(hazard: string, severity: string, agencies: string[] | string, headline: string, langName: string) {
  return `An official disaster alert says:
Hazard: ${hazard}
Severity: ${severity}
Agencies: ${Array.isArray(agencies) ? agencies.join(", ") : agencies}
Headline: "${headline}"

Rewrite ONLY this headline in plain, simple ${langName}, 2-3 short sentences, for someone who isn't familiar with weather/disaster terminology. Explain what the official wording means in everyday terms. Do NOT add any safety instructions, numbers, locations, or facts that are not already in the headline above — only clarify the wording given. If the headline is already simple, say so briefly rather than padding it.`;
}

// Groq's free tier (no credit card, forever-free, ~30 req/min) runs this by
// default, since this feature is called at most once per alert per device
// anyway (see lib/ai-cache.ts). If ANTHROPIC_API_KEY is set instead — or as
// well — that's used as a paid, higher-quality opt-in upgrade. Neither key
// present just means this route is skipped; the on-device glossary in
// lib/glossary.ts still works with no key and no internet after the first load.
async function askGroq(key: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) { console.error("[explain] Groq returned", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function askAnthropic(key: string, prompt: string): Promise<string | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) { console.error("[explain] Anthropic returned", res.status, await res.text().catch(() => "")); return null; }
  const data = await res.json();
  return data.content?.find((b: any) => b.type === "text")?.text?.trim() ?? null;
}

export async function POST(req: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey && !anthropicKey) return NextResponse.json({ error: "AI explanation isn't configured" }, { status: 501 });

  const body = await req.json().catch(() => null);
  const { headline, hazard, severity, agencies, language } = body ?? {};
  if (!headline || !hazard || !severity) {
    return NextResponse.json({ error: "headline, hazard and severity are required" }, { status: 400 });
  }
  const prompt = buildPrompt(hazard, severity, agencies, headline, LANG_NAMES[language] ?? "English");

  try {
    const text = groqKey ? await askGroq(groqKey, prompt) : await askAnthropic(anthropicKey!, prompt);
    if (!text) return NextResponse.json({ error: "AI explanation failed" }, { status: 502 });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[explain] failed:", err);
    return NextResponse.json({ error: "AI explanation failed" }, { status: 502 });
  }
}
