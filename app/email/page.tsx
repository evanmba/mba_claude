import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmailDashboard } from "@/components/email/EmailDashboard";
import { fetchCSV, parseEmailData, type EmailData } from "@/lib/sheets";
import { Mail } from "lucide-react";

const EMAIL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQa0nFBHXMQn5zfiYq3ywzwWQ4VegoPw9tLQDS7BQfoXvLoeXHcDdSzKTD-XaDRsB7nNEuTfrF62c1x/pub?output=csv";

export default async function EmailPage() {
  let data: EmailData = { monthly: [], campaigns: [], yearlyAvg: null };
  let fetchError = false;
  const fetchedAt = new Date().toISOString();

  try {
    const rows = await fetchCSV(EMAIL_CSV_URL);
    data = parseEmailData(rows);
  } catch {
    fetchError = true;
  }

  return (
    <DashboardLayout>
      {/* Channel banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-xl border mb-6"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
        >
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Email Marketing
          </p>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            2026 campaign analytics — delivered, opens, clicks &amp; rates
          </p>
        </div>
      </div>

      <EmailDashboard
        initialData={data}
        initialError={fetchError}
        serverFetchedAt={fetchedAt}
      />
    </DashboardLayout>
  );
}
