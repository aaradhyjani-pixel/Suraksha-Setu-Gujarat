// A plain-language expansion for the jargon that shows up in official
// warnings — no AI call, no API key, no internet needed, and it can't get a
// safety fact wrong the way a model summarizing a warning could. Matches
// whole words/phrases only, case-insensitive. English-only for now, like
// the other newer additions (see README's Known limits).
const GLOSSARY: [RegExp, string, string][] = [
  [/\bIMD\b/i, "IMD", "India Meteorological Department — the government's weather forecasting agency."],
  [/\bSACHET\b/i, "SACHET", "NDMA's national alert system that gathers warnings from IMD, CWC and every state disaster authority into one feed."],
  [/\bNDMA\b/i, "NDMA", "National Disaster Management Authority — India's top body for disaster planning and response."],
  [/\bCWC\b/i, "CWC", "Central Water Commission — tracks river and reservoir levels, issues flood warnings."],
  [/\bSDMA\b/i, "SDMA", "State Disaster Management Authority — the state government's own disaster-response body."],
  [/\bred alert\b/i, "Red alert", "The most serious level — take action now, don't wait."],
  [/\borange alert\b/i, "Orange alert", "Be prepared — conditions are likely to get worse, plan to move to safety."],
  [/\byellow alert\b/i, "Yellow alert", "Stay aware and watch for updates — not yet an immediate danger."],
  [/\badvisory\b/i, "Advisory", "A heads-up to stay alert and watch conditions, one step below a formal warning."],
  [/\bnowcast\b/i, "Nowcast", "A very short-range forecast — what's expected in the next few hours, not days."],
  [/\bdepression\b/i, "Depression", "An early, weaker stage of a cyclone — can still strengthen further."],
  [/\bcyclonic storm\b/i, "Cyclonic storm", "A fully formed cyclone with strong, damaging winds."],
  [/\bstorm surge\b/i, "Storm surge", "Seawater pushed inland by a cyclone's winds — the most dangerous part of a coastal cyclone, more than the wind itself."],
];

export function explainTerms(text: string): [string, string][] {
  const found: [string, string][] = [];
  const seen = new Set<string>();
  for (const [pattern, term, def] of GLOSSARY) {
    if (pattern.test(text) && !seen.has(term)) {
      seen.add(term);
      found.push([term, def]);
    }
  }
  return found;
}
