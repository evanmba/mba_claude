import { fetchCBOAdSpend } from "./meta";

// The 3 main ad creatives to track. Spend is summed from any CBO Winners ad
// whose normalized name contains the pattern (e.g. "1002.1.7.3.4" matches "1002.1.7").
export const MAIN_CREATIVES = [
  { label: "1002.1.7", pattern: "1002.1.7" },
  { label: "1009.6.1", pattern: "1009.6.1" },
  { label: "1007.5",   pattern: "1007.5"   },
] as const;

export interface CreativeSpend {
  label: string;
  spend4d: number;
  spend7d: number;
  spend14d: number;
  spend30d: number;
}

// Strip leading all-caps prefix: "TOF 1002.1.7.3.4" → "1002.1.7.3.4"
function normalizeName(name: string): string {
  const pipeIdx = name.indexOf(" | ");
  if (pipeIdx >= 0) return name.slice(pipeIdx + 3).trim();
  return name.trim().replace(/^[A-Z]{2,}\s+/, "");
}

function sumForPattern(
  rows: { adName: string; spend: number }[],
  pattern: string,
): number {
  return rows
    .filter((r) => normalizeName(r.adName).includes(pattern))
    .reduce((s, r) => s + r.spend, 0);
}

export async function fetchMainCreativeSpend(): Promise<CreativeSpend[]> {
  const [s4d, s7d, s14d, s30d] = await Promise.all([
    fetchCBOAdSpend("4d"),
    fetchCBOAdSpend("7d"),
    fetchCBOAdSpend("14d"),
    fetchCBOAdSpend("month"),
  ]);

  return MAIN_CREATIVES.map(({ label, pattern }) => ({
    label,
    spend4d:  sumForPattern(s4d,  pattern),
    spend7d:  sumForPattern(s7d,  pattern),
    spend14d: sumForPattern(s14d, pattern),
    spend30d: sumForPattern(s30d, pattern),
  }));
}
