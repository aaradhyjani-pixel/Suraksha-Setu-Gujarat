import type { T } from "@/lib/i18n";
import type { Severity } from "@/lib/types";

export default function SeverityBadge({ severity, t }: { severity: Severity; t: T }) {
  return <span className={`badge sev-${severity}`}>{t(`s_${severity}`)}</span>;
}
