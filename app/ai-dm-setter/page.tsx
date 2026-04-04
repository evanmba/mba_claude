import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getAIDMDashboardData } from "@/lib/ai-dm-fetch";
import { AIDMClient } from "./AIDMClient";

export const dynamic = "force-dynamic";

export default async function AIDMSetterPage() {
  const data = await getAIDMDashboardData();

  return (
    <DashboardLayout>
      <AIDMClient data={data} />
    </DashboardLayout>
  );
}
