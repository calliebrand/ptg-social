import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { currentUser } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { graphVersion, IG_SCOPES, metaConfigured, redirectUri } from "@/lib/instagram";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await currentUser();
  const origin = new URL(request.url).origin;
  if (!user || !canApprove(user.role)) {
    return NextResponse.redirect(new URL("/settings?error=forbidden", origin));
  }
  if (!metaConfigured()) {
    return NextResponse.redirect(new URL("/settings?error=missing_meta", origin));
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: redirectUri(),
    state,
    scope: IG_SCOPES,
    response_type: "code",
  });
  const response = NextResponse.redirect(
    `https://www.facebook.com/${graphVersion()}/dialog/oauth?${params}`,
  );
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}
