import { fetchLandingPageData } from "@/lib/landingPage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchLandingPageData();
    return Response.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
