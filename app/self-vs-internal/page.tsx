import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { fetchSelfVsInternalData } from "@/lib/self-vs-internal-fetch";
import { SelfVsInternalClient } from "./SelfVsInternalClient";

export default async function SelfVsInternalPage() {
  const data = await fetchSelfVsInternalData();
  return (
    <DashboardLayout>
      <SelfVsInternalClient data={data} />
    </DashboardLayout>
  );
}
