import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCaptionTemplate, createHashtagSet, deleteCaptionTemplate, deleteHashtagSet } from "@/app/actions/content";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";

export default async function TemplatesPage() {
  const user = await requireUser();
  const editable = canEdit(user.role);
  const [templates, sets] = await Promise.all([
    prisma.captionTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.hashtagSet.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        kicker="Reuse"
        title="Templates"
        lede="Caption blocks and hashtag sets drop into the editor. The 15% first-order line is already saved."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Captions</h2>
          {editable && (
            <form action={createCaptionTemplate} className="space-y-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <Input name="name" placeholder="Name" required />
              <Textarea name="body" placeholder="Caption block" required />
              <Button type="submit">Save template</Button>
            </form>
          )}
          {templates.map((template) => (
            <article key={template.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <h3 className="text-base font-semibold">{template.name}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{template.body}</p>
              {editable && (
                <form action={deleteCaptionTemplate} className="mt-3">
                  <input type="hidden" name="id" value={template.id} />
                  <button className="text-xs font-medium text-[#E01F26]">Remove</button>
                </form>
              )}
            </article>
          ))}
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Hashtag sets</h2>
          {editable && (
            <form action={createHashtagSet} className="space-y-2 rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <Input name="name" placeholder="Name" required />
              <Textarea name="tags" placeholder="#preachthegospel #christianstreetwear" required className="min-h-20" />
              <Button type="submit">Save set</Button>
            </form>
          )}
          {sets.map((set) => (
            <article key={set.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <h3 className="text-base font-semibold">{set.name}</h3>
              <p className="mt-2 font-mono text-xs">{set.tags}</p>
              {editable && (
                <form action={deleteHashtagSet} className="mt-3">
                  <input type="hidden" name="id" value={set.id} />
                  <button className="text-xs font-medium text-[#E01F26]">Remove</button>
                </form>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
