import { NextResponse } from "next/server";
import { fetchMetaAdsInsights, getYesterdayDate, isMetaAdsConnected } from "@/lib/meta-ads";

export async function GET(request: Request) {
  if (!isMetaAdsConnected()) {
    return NextResponse.json({ connected: false, insights: null });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? getYesterdayDate();

  try {
    const insights = await fetchMetaAdsInsights(date);
    return NextResponse.json({ connected: true, insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ connected: true, error: message }, { status: 500 });
  }
}
