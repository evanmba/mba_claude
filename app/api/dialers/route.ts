import { NextResponse } from "next/server";
import { getDialerDashboardData } from "@/lib/dialers-fetch";

export async function GET() {
  const data = await getDialerDashboardData();
  return NextResponse.json(data);
}
