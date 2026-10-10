import { NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized cron." }, { status: 401 });
  }
  try {
    const results = await publishDuePosts();
    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
