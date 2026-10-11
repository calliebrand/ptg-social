import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button, Kbd } from "@/components/ui/button";
import { duplicatePost } from "@/app/actions/posts";
import { postTypeLabel, statusLabel, POST_STATUSES, POST_TYPES } from "@/lib/posts";
import { chicagoStamp } from "@/lib/time";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const status = POST_STATUSES.find((item) => item === params.status);
  const postType = POST_TYPES.find((item) => item === params.type);
  const posts = await prisma.post.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(postType ? { postType } : {}),
      ...(params.q ? { OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { caption: { contains: params.q, mode: "insensitive" } },
        { bibleReference: { contains: params.q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        kicker="All copy"
        title="Posts"
        lede="The 30-day plan lives here as drafts until you approve a slot."
        actions={
          canEdit(user.role) ? (
            <Button asChild>
              <Link href="/posts/new">
                Create Post
                <Kbd>C</Kbd>
              </Link>
            </Button>
          ) : null
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={params.q || ""} placeholder="Search" className="field w-auto" />
        <select name="status" defaultValue={status || ""} className="field w-auto">
          <option value="">Any status</option>
          {POST_STATUSES.map((item) => (
            <option key={item} value={item}>{statusLabel(item)}</option>
          ))}
        </select>
        <select name="type" defaultValue={postType || ""} className="field w-auto">
          <option value="">Any type</option>
          {POST_TYPES.map((item) => (
            <option key={item} value={item}>{postTypeLabel(item)}</option>
          ))}
        </select>
        <button className="btn btn-primary">Filter</button>
      </form>
      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line text-xs font-medium">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-line">
                <td className="px-3 py-3 font-mono text-xs">{post.planNumber ? String(post.planNumber).padStart(2, "0") : "—"}</td>
                <td className="px-3 py-3">
                  <Link href={`/posts/${post.id}`} className="font-medium underline">{post.title}</Link>
                  <div className="text-xs text-mute">{post.bibleReference}</div>
                </td>
                <td className="px-3 py-3 font-mono text-[11px]">{post.scheduledAt ? chicagoStamp(post.scheduledAt) : "Unscheduled"}</td>
                <td className="px-3 py-3">{postTypeLabel(post.postType)}</td>
                <td className="px-3 py-3"><StatusBadge status={post.status} /></td>
                <td className="px-3 py-3">
                  {canEdit(user.role) && (
                    <form action={duplicatePost}>
                      <input type="hidden" name="id" value={post.id} />
                      <button className="text-xs font-medium underline">Copy</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && <p className="px-3 py-8 text-sm">No posts yet. Seed the plan or start a draft.</p>}
      </div>
    </div>
  );
}
