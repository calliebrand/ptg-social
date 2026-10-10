import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { exchangeCode, findInstagramAccount, saveConnection } from "@/lib/instagram";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (code: string) => NextResponse.redirect(new URL(`/settings?error=${code}`, origin));

  const user = await currentUser();
  if (!user || !canApprove(user.role)) return fail("forbidden");

  const oauthError = url.searchParams.get("error");
  if (oauthError) return fail("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("ig_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) return fail("state");

  try {
    const token = await exchangeCode(code);
    const account = await findInstagramAccount(token.access_token);
    await saveConnection(account, user.id, token.expires_in);
    await logActivity({
      userId: user.id,
      action: "instagram.connect",
      entityType: "instagram",
      detail: `${user.name} connected @${account.username}.`,
    });
    const response = NextResponse.redirect(
      new URL(
        account.matchedTarget ? "/settings?connected=1" : "/settings?connected=1&warning=username",
        origin,
      ),
    );
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "connection failed";
    const response = NextResponse.redirect(
      new URL(`/settings?error=token&detail=${encodeURIComponent(message.slice(0, 240))}`, origin),
    );
    response.cookies.delete("ig_oauth_state");
    return response;
  }
}
