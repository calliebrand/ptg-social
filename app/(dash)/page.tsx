import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { chicagoStamp } from "@/lib/time";
import { postTypeLabel, statusLabel } from "@/lib/posts";
import { Button } from "@/components/ui/button";

export default async function DeskPage() {
  const [counts, upcoming, gaps, activity, connection, due] = await Promise.all([
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.findMany({
      where: { scheduledAt: { not: null }, status: { not: "PUBLISHED" } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
      include: { media: { include: { asset: true }, orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.post.findMany({
      where: {
        status: { not: "PUBLISHED" },
        media: { none: {} },
      },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.instagramAccount.findFirst(),
    prisma.post.count({
      where: { status: "SCHEDULED", scheduledAt: { lte: new Date() }, approvedById: { not: null } },
    }),
  ]);

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div>
      <PageHeader
        kicker="Preach the Gospel"
        title="Dashboard"
        lede="Thirty days of scripture, product, and Houston. Nothing publishes until an owner or admin approves it."
        actions={
          <Button asChild>
            <Link href="/posts/new">Create Post</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Posts" value={String(total)} />
        {["DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "FAILED"].map((status) => (
          <Stat
            key={status}
            label={statusLabel(status)}
            value={String(counts.find((row) => row.status === status)?._count._all ?? 0)}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold">Coming up</h2>
            <Link href="/calendar" className="text-xs font-medium underline">
              Calendar
            </Link>
          </div>
          <ul>
            {upcoming.map((post) => (
              <li key={post.id} className="border-b border-slate-200/15 last:border-0">
                <Link href={`/posts/${post.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/50">
                  <div className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {post.scheduledAt ? chicagoStamp(post.scheduledAt) : "Unscheduled"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{post.title}</div>
                    <div className="text-xs text-slate-400">
                      {postTypeLabel(post.postType)}
                    </div>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
              </li>
            ))}
            {upcoming.length === 0 && <li className="px-4 py-8 text-sm">No dated posts yet.</li>}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="text-base font-semibold">Instagram</h2>
            <p className="mt-2 text-sm">
              {connection ? (
                <>Connected as @{connection.username}. {due} approved post{due === 1 ? "" : "s"} waiting on the clock.</>
              ) : (
                <>Not connected. Publishing stays off until Facebook Login is finished in settings.</>
              )}
            </p>
            <Link href="/settings" className="mt-3 inline-block text-xs font-medium underline">
              {connection ? "Connection" : "Connect"}
            </Link>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="text-base font-semibold">Needs a file</h2>
            <ul className="mt-3 space-y-2">
              {gaps.map((post) => (
                <li key={post.id}>
                  <Link href={`/posts/${post.id}`} className="text-sm underline">
                    {post.title}
                  </Link>
                  <div className="text-xs text-slate-400">
                    {post.assetStatus || "No asset"}
                  </div>
                </li>
              ))}
              {gaps.length === 0 && <li className="text-sm">Every open post has media.</li>}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <h2 className="text-base font-semibold">Activity</h2>
            <ul className="mt-3 space-y-2">
              {activity.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.detail}
                  <div className="text-xs text-slate-400">
                    {chicagoStamp(item.createdAt)}
                  </div>
                </li>
              ))}
              {activity.length === 0 && <li className="text-sm">The log is empty.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-3">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
