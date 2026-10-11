import { PageHeader } from "@/components/page-header";
import { loadInsights, metaConfigured } from "@/lib/instagram";
import Link from "next/link";

export default async function InsightsPage() {
  let data: Awaited<ReturnType<typeof loadInsights>> | null = null;
  let error: string | null = null;
  try {
    data = await loadInsights();
  } catch (err) {
    error = err instanceof Error ? err.message : "Insights request failed.";
  }

  return (
    <div>
      <PageHeader
        kicker="After it is live"
        title="Analytics"
        lede="Likes, comments, reach, saves, and shares from the Instagram professional account once Facebook Login is connected."
      />
      {error && (
        <div className="border border-ptg/40 bg-ptg/5 p-4 text-sm">
          {error} Check that the token still has instagram_manage_insights and pages_read_engagement.
        </div>
      )}
      {data && !data.connected && (
        <div className="border border-line bg-paper p-6">
          <h2 className="font-display text-3xl leading-none">Not connected</h2>
          <p className="mt-2 max-w-xl text-sm">
            {metaConfigured()
              ? "Meta app credentials are present. Connect @preachthegospel.store from Instagram settings."
              : "Add META_APP_ID and META_APP_SECRET, then connect the account. Until then this page has nothing to chart."}
          </p>
          <Link href="/settings" className="mt-4 inline-block text-xs font-medium underline">
            Instagram settings
          </Link>
        </div>
      )}
      {data?.connected && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Followers" value={data.followers} />
            <Metric label="Following" value={data.follows} />
            <Metric label="Media" value={data.mediaCount} />
          </div>
          <p className="text-xs font-medium text-mute">@{data.username}</p>
          <div className="overflow-x-auto border border-line bg-paper">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs font-medium">
                <tr>
                  <th className="px-3 py-2">Post</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Likes</th>
                  <th className="px-3 py-2">Comments</th>
                  <th className="px-3 py-2">Reach</th>
                  <th className="px-3 py-2">Saves</th>
                  <th className="px-3 py-2">Shares</th>
                  <th className="px-3 py-2">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.media.map((item) => (
                  <tr key={item.id} className="border-b border-line">
                    <td className="max-w-xs px-3 py-3">
                      <a href={item.permalink || "#"} className="line-clamp-2 underline" target="_blank" rel="noreferrer">
                        {item.caption.slice(0, 80) || item.id}
                      </a>
                    </td>
                    <td className="px-3 py-3">{item.mediaType}</td>
                    <td className="px-3 py-3">{num(item.likeCount)}</td>
                    <td className="px-3 py-3">{num(item.commentsCount)}</td>
                    <td className="px-3 py-3">{num(item.reach)}</td>
                    <td className="px-3 py-3">{num(item.saved)}</td>
                    <td className="px-3 py-3">{num(item.shares)}</td>
                    <td className="px-3 py-3">{num(item.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.media.length === 0 && <p className="px-3 py-6 text-sm">The account has no media yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border border-line bg-paper p-4">
      <div className="text-xs font-medium text-mute">{label}</div>
      <div className="font-display text-4xl leading-none">{value ?? "—"}</div>
    </div>
  );
}

function num(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en-US");
}
