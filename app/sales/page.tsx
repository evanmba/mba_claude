import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getSalesDashboardData } from "@/lib/sales-fetch";
import SalesClient from "./SalesClient";

export default async function SalesPage() {
  const data = await getSalesDashboardData();
  return (
    <DashboardLayout>
      <SalesClient data={data} />
    </DashboardLayout>
  );
}
