import { fetchAdSpendByIds, AdWindow } from "./meta";

// ─── The 3 tracked ad creatives ───────────────────────────────────────────────

const TRACKED_ADS = [
  { id: "120246732599790699", label: "1002.1.7.3.4" },
  { id: "120246732565570699", label: "1009.6.1.2"   },
  { id: "120246732664910699", label: "1007.5"        },
] as const;

const AD_IDS = TRACKED_ADS.map((a) => a.id);

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreativeSpend {
  label: string;
  adName: string;   // actual name returned by Meta
  spend7d: number;
  spend14d: number;
  spend30d: number;
}

// ─── Main export ───────────────────────────────────────────────────────────────

export async function fetchMainCreativeSpend(): Promise<CreativeSpend[]> {
  const [s7d, s14d, s30d] = await Promise.all([
    fetchAdSpendByIds(AD_IDS, "7d"),
    fetchAdSpendByIds(AD_IDS, "14d"),
    fetchAdSpendByIds(AD_IDS, "month"),
  ]);

  const byId = (rows: { adId: string; adName: string; spend: number }[]) =>
    new Map(rows.map((r) => [r.adId, r]));

  const m7d  = byId(s7d);
  const m14d = byId(s14d);
  const m30d = byId(s30d);

  return TRACKED_ADS.map(({ id, label }) => {
    const adName = m30d.get(id)?.adName ?? m14d.get(id)?.adName ?? m7d.get(id)?.adName ?? label;
    return {
      label,
      adName,
      spend7d:  m7d.get(id)?.spend  ?? 0,
      spend14d: m14d.get(id)?.spend ?? 0,
      spend30d: m30d.get(id)?.spend ?? 0,
    };
  });
}
