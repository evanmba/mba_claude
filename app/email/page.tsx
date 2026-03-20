import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmailDashboard } from "@/components/email/EmailDashboard";
import { SortableEmailLog } from "@/components/email/SortableEmailLog";
import { fetchCSV, parseEmailData, parseEmailLogCSV, fetchEmailLogViaAPI, type EmailData, type EmailLog } from "@/lib/sheets";
import { Mail } from "lucide-react";

const EMAIL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQa0nFBHXMQn5zfiYq3ywzwWQ4VegoPw9tLQDS7BQfoXvLoeXHcDdSzKTD-XaDRsB7nNEuTfrF62c1x/pub?output=csv";

const SHEETS_API_KEY         = process.env.GOOGLE_SHEETS_API_KEY ?? "";
const EMAIL_SPREADSHEET_ID   = process.env.GOOGLE_EMAIL_SPREADSHEET_ID ?? "";
const EMAIL_DATA_SHEET       = process.env.GOOGLE_EMAIL_DATA_SHEET ?? "DATA";
// Published "Publish to web" CSV URL for the DATA tab (File → Share → Publish to web → DATA sheet → CSV)
const EMAIL_DATA_CSV_URL     = process.env.GOOGLE_EMAIL_DATA_CSV_URL ?? "";

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

  // ── Email log: Sheets API (hyperlinks) → CSV fallback ─────────────────────
  let emails: EmailLog[] = [];

  if (SHEETS_API_KEY && EMAIL_SPREADSHEET_ID) {
    try {
      const apiEmails = await fetchEmailLogViaAPI(EMAIL_SPREADSHEET_ID, EMAIL_DATA_SHEET, SHEETS_API_KEY);
      if (apiEmails.length > 0) emails = apiEmails;
    } catch {
      // fall through to CSV
    }
  }

  // Published CSV URL (File → Share → Publish to web → DATA sheet → CSV)
  if (emails.length === 0 && EMAIL_DATA_CSV_URL) {
    try {
      const dataRows = await fetchCSV(EMAIL_DATA_CSV_URL, { cache: "no-store" });
      const parsed = parseEmailLogCSV(dataRows);
      if (parsed.length > 0) emails = parsed;
    } catch {
      // fall through
    }
  }

  // Last resort: export URL with hardcoded gid (only works if sheet is shared publicly)
  if (emails.length === 0 && EMAIL_SPREADSHEET_ID) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${EMAIL_SPREADSHEET_ID}/export?format=csv&gid=1377726109`;
      const dataRows = await fetchCSV(csvUrl, { cache: "no-store" });
      const parsed = parseEmailLogCSV(dataRows);
      if (parsed.length > 0) emails = parsed;
    } catch {
      // no log data available
    }
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

      {/* Email log */}
      <div className="mt-6">
        <SortableEmailLog emails={emails} />
      </div>
    </DashboardLayout>
  );
}
