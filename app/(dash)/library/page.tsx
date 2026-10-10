import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { deleteAsset } from "@/app/actions/library";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { LibraryUpload } from "@/components/library-upload";

export default async function LibraryPage() {
  const user = await requireUser();
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: "desc" },
    include: { posts: { include: { post: { select: { id: true, title: true } } } } },
  });

  return (
    <div>
      <PageHeader
        kicker="Files"
        title="Library"
        lede="Quote cards, photos, and reels you can attach to any post. On Vercel these go to Blob. Locally they stay in public/uploads."
        actions={canEdit(user.role) ? <LibraryUpload /> : null}
      />
      {assets.length === 0 && (
        <div className="border border-dashed border-[#0A0A0A] bg-[#F7F3EA] p-8 text-sm">
          Nothing in the library yet. Upload a JPEG, PNG, or MP4, or run the seed to pull in the five quote cards.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => (
          <article key={asset.id} className="border border-[#0A0A0A] bg-[#F7F3EA]">
            {asset.mimeType.startsWith("video/") ? (
              <video src={asset.url} className="aspect-square w-full bg-[#0A0A0A] object-cover" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.alt || asset.filename} className="aspect-square w-full object-cover" />
            )}
            <div className="space-y-2 p-3">
              <div className="truncate text-sm">{asset.filename}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#767778]">
                {asset.storage} · {Math.ceil(asset.size / 1024)} KB
              </div>
              <ul className="text-xs">
                {asset.posts.map((link) => (
                  <li key={link.id}>
                    <a className="underline" href={`/posts/${link.post.id}`}>{link.post.title}</a>
                  </li>
                ))}
                {asset.posts.length === 0 && <li className="text-[#767778]">Not on a post</li>}
              </ul>
              {canEdit(user.role) && (
                <form action={deleteAsset}>
                  <input type="hidden" name="id" value={asset.id} />
                  <button className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#E01F26]">Remove</button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
