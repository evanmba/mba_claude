import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AthletesRoster } from "@/components/athlete/AthletesRoster";
import { getAllAthletes, isSheetConfigured } from "@/lib/athletes-store";
import { type AthleteHistory } from "@/lib/athletes";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let athletes: AthleteHistory[] = [];
  let loadError = false;
  const fetchedAt = new Date().toISOString();

  try {
    athletes = await getAllAthletes();
  } catch {
    loadError = true;
  }

  const configured = isSheetConfigured();

  return (
    <DashboardLayout>
      {!configured && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}
        >
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>
            Google Sheet storage isn&apos;t configured yet — check-ins are being saved to a local
            file that resets on redeploy. Add the athlete Sheet credentials to persist data. See{" "}
            <code>ATHLETE_CHECKIN_SETUP.md</code>.
          </span>
        </div>
      )}

      {loadError && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 text-sm"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}
        >
          <AlertCircle size={16} />
          <span>Could not load athlete data. Check the Sheet credentials and sharing settings.</span>
        </div>
      )}

      <AthletesRoster initialAthletes={athletes} serverFetchedAt={fetchedAt} />
    </DashboardLayout>
  );
}
