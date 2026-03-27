import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { fetchMetaAdsInsights, getYesterdayDate, isMetaAdsConnected, ACCOUNT_ID } from "@/lib/meta-ads";
import { TrendingUp, DollarSign, MousePointerClick, Eye, Users, ShoppingCart, Target } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  sub?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtCurrency(n: number): string {
  return `$${fmt(n)}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtPct(n: number): string {
  return `${fmt(n)}%`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color = "#3b82f6", sub }: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: color + "1a" }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted-foreground)" }}>
      {title}
    </h2>
  );
}

function NotConnected() {
  return (
    <div
      className="rounded-xl p-8 border text-center"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "#1877F21a" }}
      >
        <Target size={28} style={{ color: "#1877F2" }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--foreground)" }}>
        Meta Ads not configured
      </h3>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "var(--muted-foreground)" }}>
        Add <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--secondary)" }}>META_ADS_ACCESS_TOKEN</code> and{" "}
        <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--secondary)" }}>META_ADS_ACCOUNT_ID</code> to your{" "}
        <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--secondary)" }}>.env.local</code> to connect.
      </p>
      <div
        className="rounded-lg p-4 text-left text-sm font-mono max-w-sm mx-auto"
        style={{ background: "var(--secondary)", color: "var(--foreground)" }}
      >
        <div style={{ color: "var(--muted-foreground)" }}># .env.local</div>
        <div>META_ADS_ACCESS_TOKEN=<span style={{ color: "#22c55e" }}>your_token</span></div>
        <div>META_ADS_ACCOUNT_ID=<span style={{ color: "#22c55e" }}>account_id</span></div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MetaAdsPage() {
  const accentColor = "#1877F2"; // Meta blue

  if (!isMetaAdsConnected()) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: accentColor + "1a" }}
            >
              <Target size={22} style={{ color: accentColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Meta Ads
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Account …498
              </p>
            </div>
          </div>
          <NotConnected />
        </div>
      </DashboardLayout>
    );
  }

  const date = getYesterdayDate();
  let insights = null;
  let fetchError: string | null = null;

  try {
    insights = await fetchMetaAdsInsights(date);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const accountDisplay = ACCOUNT_ID.replace("act_", "").slice(-3).padStart(ACCOUNT_ID.replace("act_", "").length, "•");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: accentColor + "1a" }}
            >
              <Target size={22} style={{ color: accentColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Meta Ads
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Account …{ACCOUNT_ID.replace("act_", "").slice(-3)} &nbsp;·&nbsp; Yesterday ({date})
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium"
            style={{
              background: "#22c55e1a",
              borderColor: "#22c55e33",
              color: "#22c55e",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Connected
          </div>
        </div>

        {fetchError ? (
          <div
            className="rounded-xl p-6 border"
            style={{ background: "var(--card)", borderColor: "#ef444433" }}
          >
            <p className="font-medium mb-1" style={{ color: "#ef4444" }}>
              Failed to fetch insights
            </p>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {fetchError}
            </p>
          </div>
        ) : insights ? (
          <div className="space-y-8">
            {/* Revenue & Spend */}
            <div>
              <SectionHeader title="Revenue & Spend" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Amount Spent"
                  value={fmtCurrency(insights.spend)}
                  icon={DollarSign}
                  color="#ef4444"
                />
                <MetricCard
                  label="Revenue"
                  value={fmtCurrency(insights.revenue)}
                  icon={TrendingUp}
                  color="#22c55e"
                />
                <MetricCard
                  label="ROAS"
                  value={`${fmt(insights.roas)}×`}
                  icon={TrendingUp}
                  color={insights.roas >= 1 ? "#22c55e" : "#ef4444"}
                  sub="Return on Ad Spend"
                />
                <MetricCard
                  label="Purchases"
                  value={fmtInt(insights.purchases)}
                  icon={ShoppingCart}
                  color={accentColor}
                />
              </div>
            </div>

            {/* Cost Metrics */}
            <div>
              <SectionHeader title="Cost Metrics" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Cost Per Purchase"
                  value={fmtCurrency(insights.cost_per_purchase)}
                  icon={DollarSign}
                  color="#f59e0b"
                />
                <MetricCard
                  label="Cost Per Acquisition"
                  value={fmtCurrency(insights.cost_per_acquisition)}
                  icon={Target}
                  color="#f59e0b"
                />
                <MetricCard
                  label="CPM"
                  value={fmtCurrency(insights.cpm)}
                  icon={Eye}
                  color="var(--muted-foreground)"
                  sub="Cost per 1,000 impressions"
                />
                <MetricCard
                  label="CPC (All)"
                  value={fmtCurrency(insights.cpc)}
                  icon={MousePointerClick}
                  color="var(--muted-foreground)"
                  sub="Cost per click"
                />
              </div>
            </div>

            {/* Reach & Engagement */}
            <div>
              <SectionHeader title="Reach & Engagement" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Impressions"
                  value={fmtInt(insights.impressions)}
                  icon={Eye}
                  color={accentColor}
                />
                <MetricCard
                  label="Reach"
                  value={fmtInt(insights.reach)}
                  icon={Users}
                  color={accentColor}
                />
                <MetricCard
                  label="Frequency"
                  value={fmt(insights.frequency)}
                  icon={TrendingUp}
                  color="var(--muted-foreground)"
                  sub="Avg impressions per person"
                />
                <MetricCard
                  label="CTR (All)"
                  value={fmtPct(insights.ctr)}
                  icon={MousePointerClick}
                  color="#d946ef"
                />
              </div>
            </div>

            {/* Clicks */}
            <div>
              <SectionHeader title="Clicks" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Link Clicks"
                  value={fmtInt(insights.link_clicks)}
                  icon={MousePointerClick}
                  color={accentColor}
                />
                <MetricCard
                  label="Unique Link Clicks"
                  value={fmtInt(insights.unique_link_clicks)}
                  icon={MousePointerClick}
                  color="#d946ef"
                />
              </div>
            </div>

            {/* Raw data table */}
            <div>
              <SectionHeader title="Raw Data" />
              <div
                className="rounded-xl border overflow-x-auto"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {[
                        "Date", "Spent", "Purchases", "CPP", "Link Clicks",
                        "Impressions", "Reach", "Freq", "CPM", "CTR",
                        "Unique Clicks", "CPC", "ROAS", "Revenue", "CPA",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[
                        date,
                        fmtCurrency(insights.spend),
                        fmtInt(insights.purchases),
                        fmtCurrency(insights.cost_per_purchase),
                        fmtInt(insights.link_clicks),
                        fmtInt(insights.impressions),
                        fmtInt(insights.reach),
                        fmt(insights.frequency),
                        fmtCurrency(insights.cpm),
                        fmtPct(insights.ctr),
                        fmtInt(insights.unique_link_clicks),
                        fmtCurrency(insights.cpc),
                        `${fmt(insights.roas)}×`,
                        fmtCurrency(insights.revenue),
                        fmtCurrency(insights.cost_per_acquisition),
                      ].map((v, i) => (
                        <td
                          key={i}
                          className="px-3 py-3 whitespace-nowrap font-mono text-xs"
                          style={{ color: "var(--foreground)" }}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Setup reminder */}
            <div
              className="rounded-xl p-5 border text-sm"
              style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
            >
              <p className="font-medium mb-2" style={{ color: "var(--foreground)" }}>
                Automated daily sync
              </p>
              <p style={{ color: "var(--muted-foreground)" }}>
                To write these metrics to Google Sheets automatically each morning, run the sync script via cron or call{" "}
                <code
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: "var(--card)" }}
                >
                  POST /api/meta-ads/sync
                </code>
                . See{" "}
                <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--card)" }}>
                  scripts/sync-meta-ads.ts
                </code>{" "}
                for cron setup instructions.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
