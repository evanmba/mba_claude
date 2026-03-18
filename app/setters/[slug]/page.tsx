import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  SETTERS,
  SETTER_MONTHLY_DATA,
  AVAILABLE_MONTHS,
} from "@/lib/setter-data";
import { notFound } from "next/navigation";
import SetterClientPage from "./SetterClientPage";

export function generateStaticParams() {
  return SETTERS.map((s) => ({ slug: s.id }));
}

export default function SetterPage({ params }: { params: { slug: string } }) {
  const setter = SETTERS.find((s) => s.id === params.slug);
  if (!setter) notFound();

  const monthlyData = SETTER_MONTHLY_DATA[setter.id] ?? {};

  return (
    <DashboardLayout>
      <SetterClientPage setter={setter} monthlyData={monthlyData} availableMonths={AVAILABLE_MONTHS} />
    </DashboardLayout>
  );
}
