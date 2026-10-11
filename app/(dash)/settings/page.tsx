import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PublishButton } from "@/components/publish-button";
import { disconnectInstagram } from "@/app/actions/instagram";
import { requireUser } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { instagramUsername, metaConfigured } from "@/lib/instagram";

const errors: Record<string, string> = {
  missing_meta: "META_APP_ID and META_APP_SECRET are not set. The connect button cannot start Facebook Login yet.",
  forbidden: "Only an owner or admin can connect Instagram.",
  denied: "Facebook Login was cancelled.",
  state: "The login attempt expired. Try connecting again.",
  token: "Meta did not return a usable token.",
  no_page: "No Facebook Page with a linked Instagram account was found.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const account = await prisma.instagramAccount.findFirst({ orderBy: { createdAt: "desc" } });
  const approver = canApprove(user.role);
  const error = params.error ? errors[params.error] || "Instagram connection failed." : null;

  return (
    <div>
      <PageHeader title="Settings" />

      {error && (
        <div className="mb-4 border border-ptg/40 bg-ptg/5 p-4 text-sm">
          {error}
          {params.detail ? ` ${params.detail}` : ""}
        </div>
      )}
      {params.connected && (
        <div className="card mb-4 p-4 text-sm">
          Instagram is connected.
          {params.warning === "username"
            ? ` The account is not @${instagramUsername()}. Confirm this is the right Page before you schedule.`
            : ""}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-[15px] font-medium tracking-[-0.02em]">Connection</h2>
          {account ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>Signed in as <strong>@{account.username}</strong></p>
              <p>Facebook Page: {account.pageName || account.pageId}</p>
              <p className="text-xs text-mute">
                Instagram user {account.igUserId}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm">No account connected. Posts can be drafted and approved, and they will not publish.</p>
          )}
          {approver && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/api/instagram/connect">{account ? "Reconnect" : "Connect Instagram"}</Link>
              </Button>
              {account && (
                <form action={async () => { "use server"; await disconnectInstagram(); }}>
                  <Button type="submit" variant="outline">Disconnect</Button>
                </form>
              )}
            </div>
          )}
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="text-xs font-medium">Run the publisher now</h3>
            <p className="mt-2 text-sm">
              Same gate as the cron: status must be Scheduled, an owner or admin must have approved it, and the Central time must have passed.
              {process.env.INSTAGRAM_PUBLISH_MODE === "dry-run" ? " Dry-run is on, so this will not call Meta." : ""}
            </p>
            {approver && (
              <div className="mt-3">
                <PublishButton />
              </div>
            )}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold">Meta app</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-mute">
            <li>Create a Business app at developers.facebook.com and add Facebook Login plus Instagram.</li>
            <li>Set the OAuth redirect to your AUTH_URL plus /api/instagram/callback.</li>
            <li>Put the app id and secret in META_APP_ID and META_APP_SECRET. {metaConfigured() ? "Those are set." : "They are empty right now."}</li>
            <li>Make @preachthegospel.store a professional account linked to a Facebook Page you admin.</li>
            <li>In Development mode, add that Facebook user as an app admin or tester. Live mode needs App Review for the publish and insights permissions.</li>
            <li>Uploads that Instagram fetches must be public https JPEGs or MP4s. Set BLOB_READ_WRITE_TOKEN.</li>
          </ol>
          <p className="mt-4 text-sm text-mute">The click-path is in the README under Meta app setup.</p>
        </section>
      </div>
    </div>
  );
}
