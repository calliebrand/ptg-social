"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { addComment, deletePost, duplicatePost, retryPublish, savePost, setPostStatus } from "@/app/actions/posts";
import { attachAsset, detachAsset, moveAsset } from "@/app/actions/library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input, fieldClass } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { captionStats, IG_CAPTION_LIMIT, IG_HASHTAG_LIMIT, uniqueHashtags } from "@/lib/caption";
import { canApprove, canEdit, type AppRole } from "@/lib/permissions";
import { statusLabel } from "@/lib/posts";
import type { PostInput } from "@/lib/validators";
import { cn } from "@/lib/utils";

type Media = {
  id: string;
  position: number;
  asset: { id: string; url: string; filename: string; mimeType: string; alt: string };
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
};

export type EditorPost = PostInput & {
  id: string;
  planNumber: number | null;
  status: string;
  approvedByName: string | null;
  approvedAtLabel: string | null;
  igPermalink: string | null;
  publishError: string | null;
  media: Media[];
  comments: Comment[];
};

type LibraryAsset = { id: string; url: string; filename: string; mimeType: string; alt: string };
type NamedBody = { id: string; name: string; body: string };
type TagSet = { id: string; name: string; tags: string };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#5c584e]">{label}</div>
      {children}
      {hint && <p className="text-xs text-[#5c584e]">{hint}</p>}
    </div>
  );
}

export function PostEditor({
  post,
  role,
  library,
  templates,
  hashtagSets,
}: {
  post: EditorPost | null;
  role: AppRole;
  library: LibraryAsset[];
  templates: NamedBody[];
  hashtagSets: TagSet[];
}) {
  const router = useRouter();
  const editable = canEdit(role) && post?.status !== "PUBLISHED";
  const approver = canApprove(role);
  const [form, setForm] = useState<PostInput>(() =>
    post
      ? {
          title: post.title,
          caption: post.caption,
          hashtags: post.hashtags,
          postType: post.postType,
          scheduledDate: post.scheduledDate,
          scheduledTime: post.scheduledTime,
          notes: post.notes,
          bibleReference: post.bibleReference,
          quoteText: post.quoteText,
          pillar: post.pillar,
          productTie: post.productTie,
          visualDirection: post.visualDirection,
          palette: post.palette,
          productionNotes: post.productionNotes,
          cta: post.cta,
          assetStatus: post.assetStatus,
          slides: post.slides,
        }
      : {
          title: "",
          caption: "",
          hashtags: "#preachthegospel",
          postType: "QUOTE_CARD",
          scheduledDate: "",
          scheduledTime: "",
          notes: "",
          bibleReference: "",
          quoteText: "",
          pillar: "",
          productTie: "",
          visualDirection: "",
          palette: "",
          productionNotes: "",
          cta: "",
          assetStatus: "",
          slides: [],
        },
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState("");
  const stats = useMemo(() => captionStats(form.caption, form.hashtags), [form.caption, form.hashtags]);

  function update<K extends keyof PostInput>(key: K, value: PostInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function onSave() {
    setSaving(true);
    const result = await savePost(post?.id ?? null, form);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDirty(false);
    if (result.reverted) toast.message("Saved and sent back to review. Approval was cleared.");
    else if (result.warning) toast.message(result.warning);
    else toast.success(post ? "Saved." : "Draft created.");
    if (!post) router.push(`/posts/${result.id}`);
    else router.refresh();
  }

  async function onStatus(status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "SCHEDULED") {
    if (!post) return;
    const result = await setPostStatus(post.id, status);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success("Status updated.");
      router.refresh();
    }
  }

  const cover = post?.media.find((item) => item.asset.mimeType.startsWith("image/")) ?? post?.media[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#767778]">
              {post?.planNumber ? `Plan no. ${String(post.planNumber).padStart(2, "0")}` : "New post"}
              {post ? ` · ${statusLabel(post.status)}` : ""}
            </div>
            <h1 className="font-display text-4xl leading-[0.9] md:text-5xl">{form.title || "Untitled"}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {post && <StatusBadge status={post.status} />}
            {editable && (
              <Button type="button" onClick={onSave} disabled={saving}>
                {saving ? "Saving" : post ? "Save" : "Create draft"}
              </Button>
            )}
          </div>
        </div>

        {post?.publishError && (
          <div className="border border-[#E01F26] bg-white px-4 py-3 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#E01F26]">Publish note</span>
            <p className="mt-1">{post.publishError}</p>
          </div>
        )}
        {post?.igPermalink && (
          <a className="inline-block text-sm underline" href={post.igPermalink} target="_blank" rel="noreferrer">
            View on Instagram
          </a>
        )}
        {post?.approvedByName && (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5c584e]">
            Approved by {post.approvedByName}
            {post.approvedAtLabel ? ` · ${post.approvedAtLabel} CT` : ""}
          </p>
        )}

        {post && editable && (
          <div className="flex flex-wrap gap-2 border border-[#0A0A0A] bg-[#F7F3EA] p-3">
            {post.status === "DRAFT" && (
              <Button type="button" variant="outline" disabled={dirty} onClick={() => onStatus("IN_REVIEW")}>
                Submit for review
              </Button>
            )}
            {approver && (post.status === "DRAFT" || post.status === "IN_REVIEW" || post.status === "FAILED") && (
              <Button type="button" disabled={dirty} onClick={() => onStatus("APPROVED")}>
                Approve
              </Button>
            )}
            {approver && post.status !== "SCHEDULED" && post.status !== "PUBLISHED" && (
              <Button type="button" variant="red" disabled={dirty} onClick={() => onStatus("SCHEDULED")}>
                Approve and schedule
              </Button>
            )}
            {approver && post.status === "SCHEDULED" && (
              <Button type="button" variant="outline" onClick={() => onStatus("APPROVED")}>
                Unschedule
              </Button>
            )}
            {approver && (post.status === "APPROVED" || post.status === "SCHEDULED") && (
              <Button type="button" variant="outline" onClick={() => onStatus("IN_REVIEW")}>
                Request changes
              </Button>
            )}
            {approver && post.status === "FAILED" && (
              <Button
                type="button"
                variant="red"
                onClick={async () => {
                  const result = await retryPublish(post.id);
                  if (!result.ok) toast.error(result.error);
                  else toast.message(result.result);
                  router.refresh();
                }}
              >
                Retry publish
              </Button>
            )}
            {dirty && <span className="self-center text-xs">Save before changing status.</span>}
            <p className="w-full text-xs text-[#5c584e]">
              Nothing goes live unless an owner or admin approves it and the status is Scheduled. Editing an approved post sends it back to review.
            </p>
          </div>
        )}

        <section className="space-y-4 border border-[#0A0A0A] bg-[#F7F3EA] p-4">
          <Field label="Title">
            <Input value={form.title} disabled={!editable} onChange={(event) => update("title", event.target.value)} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Post type">
              <select
                className={fieldClass}
                value={form.postType}
                disabled={!editable}
                onChange={(event) => update("postType", event.target.value as PostInput["postType"])}
              >
                <option value="QUOTE_CARD">Quote card</option>
                <option value="REEL">Reel</option>
                <option value="CAROUSEL">Carousel</option>
                <option value="PHOTO">Photo</option>
                <option value="ENGAGEMENT">Engagement prompt</option>
              </select>
            </Field>
            <Field label="Asset status" hint="From the plan: mockup ready, shoot needed, or design from direction.">
              <Input
                value={form.assetStatus}
                disabled={!editable}
                onChange={(event) => update("assetStatus", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Date (America/Chicago)">
              <Input
                type="date"
                value={form.scheduledDate}
                disabled={!editable}
                onChange={(event) => update("scheduledDate", event.target.value)}
              />
            </Field>
            <Field label="Time (America/Chicago)">
              <Input
                type="time"
                value={form.scheduledTime}
                disabled={!editable}
                onChange={(event) => update("scheduledTime", event.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border border-[#0A0A0A] bg-[#F7F3EA] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em]">Caption</div>
            {editable && templates.length > 0 && (
              <select
                className="border border-[#0A0A0A] bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                defaultValue=""
                onChange={(event) => {
                  const template = templates.find((item) => item.id === event.target.value);
                  if (!template) return;
                  update("caption", form.caption.trim() ? `${form.caption.trim()}\n\n${template.body}` : template.body);
                  event.target.value = "";
                }}
              >
                <option value="">Insert template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Textarea
            value={form.caption}
            disabled={!editable}
            onChange={(event) => update("caption", event.target.value)}
            className="min-h-48"
          />
          <Field label="Hashtags">
            <Textarea
              value={form.hashtags}
              disabled={!editable}
              onChange={(event) => update("hashtags", event.target.value)}
              className="min-h-20 font-mono text-xs"
            />
          </Field>
          {editable && hashtagSets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hashtagSets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  className="border border-[#0A0A0A] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]"
                  onClick={() => update("hashtags", uniqueHashtags(form.hashtags, set.tags))}
                >
                  {set.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.12em]">
            <span className={cn(stats.overCharacters && "text-[#E01F26]")}>
              {stats.characters} / {IG_CAPTION_LIMIT} characters
            </span>
            <span className={cn(stats.overHashtags && "text-[#E01F26]")}>
              {stats.hashtagCount} / {IG_HASHTAG_LIMIT} hashtags
            </span>
          </div>
        </section>

        <section className="grid gap-4 border border-[#0A0A0A] bg-[#F7F3EA] p-4 md:grid-cols-2">
          <Field label="Bible reference / attribution">
            <Input
              value={form.bibleReference}
              disabled={!editable}
              placeholder="Mark 16:15 (BSB)"
              onChange={(event) => update("bibleReference", event.target.value)}
            />
          </Field>
          <Field label="Exact quote">
            <Textarea
              value={form.quoteText}
              disabled={!editable}
              className="min-h-24"
              onChange={(event) => update("quoteText", event.target.value)}
            />
          </Field>
          <Field label="Pillar">
            <Input value={form.pillar} disabled={!editable} onChange={(event) => update("pillar", event.target.value)} />
          </Field>
          <Field label="Product tie">
            <Input value={form.productTie} disabled={!editable} onChange={(event) => update("productTie", event.target.value)} />
          </Field>
          <Field label="Call to action">
            <Input value={form.cta} disabled={!editable} onChange={(event) => update("cta", event.target.value)} />
          </Field>
          <Field label="Palette">
            <Input value={form.palette} disabled={!editable} onChange={(event) => update("palette", event.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Visual direction">
              <Textarea
                value={form.visualDirection}
                disabled={!editable}
                onChange={(event) => update("visualDirection", event.target.value)}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label={form.postType === "REEL" ? "Reel script" : "Production notes"}>
              <Textarea
                value={form.productionNotes}
                disabled={!editable}
                onChange={(event) => update("productionNotes", event.target.value)}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Internal notes">
              <Textarea value={form.notes} disabled={!editable} onChange={(event) => update("notes", event.target.value)} />
            </Field>
          </div>
        </section>

        {form.postType === "CAROUSEL" && (
          <section className="space-y-3 border border-[#0A0A0A] bg-[#F7F3EA] p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em]">Carousel slides</div>
              {editable && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update("slides", [...form.slides, { heading: `S${form.slides.length + 1}`, body: "" }])
                  }
                >
                  Add slide
                </Button>
              )}
            </div>
            {form.slides.map((slide, index) => (
              <div key={index} className="grid gap-2 border border-[#0A0A0A]/30 p-3 md:grid-cols-[140px_1fr_auto]">
                <Input
                  value={slide.heading}
                  disabled={!editable}
                  onChange={(event) => {
                    const slides = [...form.slides];
                    slides[index] = { ...slide, heading: event.target.value };
                    update("slides", slides);
                  }}
                />
                <Input
                  value={slide.body}
                  disabled={!editable}
                  onChange={(event) => {
                    const slides = [...form.slides];
                    slides[index] = { ...slide, body: event.target.value };
                    update("slides", slides);
                  }}
                />
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => update("slides", form.slides.filter((_, item) => item !== index))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {form.slides.length === 0 && (
              <p className="text-sm text-[#5c584e]">Add a line of copy for each swipe. Images are attached below, in order.</p>
            )}
          </section>
        )}

        {post && (
          <section className="space-y-3 border border-[#0A0A0A] bg-[#F7F3EA] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em]">Media</div>
              {editable && (
                <div className="flex gap-2">
                  <Uploader postId={post.id} />
                  <LibraryDialog
                    library={library}
                    attached={new Set(post.media.map((item) => item.asset.id))}
                    onAttach={async (assetId) => {
                      const result = await attachAsset(post.id, assetId);
                      if (!result.ok) toast.error(result.error);
                      else router.refresh();
                    }}
                  />
                </div>
              )}
            </div>
            {post.media.length === 0 && (
              <p className="text-sm text-[#5c584e]">No file on this post yet. Upload one or pull it from the library.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {post.media.map((item, index) => (
                <div key={item.id} className="border border-[#0A0A0A] bg-white">
                  {item.asset.mimeType.startsWith("video/") ? (
                    <video src={item.asset.url} className="aspect-[4/5] w-full bg-[#0A0A0A] object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.asset.url} alt={item.asset.alt || item.asset.filename} className="aspect-[4/5] w-full object-cover" />
                  )}
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="truncate text-xs">{item.asset.filename}</div>
                    {editable && (
                      <div className="flex gap-1">
                        <button type="button" className="font-mono text-[10px]" onClick={() => moveAsset(post.id, item.asset.id, "up").then(() => router.refresh())} disabled={index === 0}>
                          Up
                        </button>
                        <button type="button" className="font-mono text-[10px]" onClick={() => moveAsset(post.id, item.asset.id, "down").then(() => router.refresh())}>
                          Down
                        </button>
                        <button type="button" className="font-mono text-[10px] text-[#E01F26]" onClick={() => detachAsset(post.id, item.asset.id).then(() => router.refresh())}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {post && canEdit(role) && (
          <div className="flex flex-wrap gap-2">
            <form action={duplicatePost}>
              <input type="hidden" name="id" value={post.id} />
              <Button type="submit" variant="outline">
                Duplicate
              </Button>
            </form>
            <form
              action={deletePost}
              onSubmit={(event) => {
                if (!confirm("Delete this post?")) event.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={post.id} />
              <Button type="submit" variant="ghost">
                Delete
              </Button>
            </form>
            <Button variant="ghost" asChild>
              <Link href="/posts">All posts</Link>
            </Button>
          </div>
        )}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="border border-[#0A0A0A] bg-[#F7F3EA] p-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#767778]">Feed preview</div>
          <div className="border border-[#0A0A0A] bg-white">
            <div className="flex items-center gap-2 border-b border-[#0A0A0A]/10 px-3 py-2">
              <div className="grid h-7 w-7 place-items-center bg-[#0A0A0A] font-mono text-[9px] text-[#E01F26]">PTG</div>
              <div className="text-xs font-semibold">preachthegospel.store</div>
            </div>
            {cover && cover.asset.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.asset.url} alt="" className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-[#F1EBDD] p-6 text-center">
                <div>
                  <div className="font-display text-3xl leading-[0.9]">{form.quoteText || form.title || "Quote"}</div>
                  {form.bibleReference && (
                    <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em]">{form.bibleReference}</div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 px-3 py-3 text-xs leading-relaxed">
              <p className="line-clamp-6 whitespace-pre-wrap">
                <span className="font-semibold">preachthegospel.store </span>
                {stats.combined || "Caption lands here."}
              </p>
            </div>
          </div>
        </div>

        {post && (
          <div className="border border-[#0A0A0A] bg-[#F7F3EA] p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#767778]">Approval notes</div>
            <div className="mt-3 space-y-3">
              {post.comments.length === 0 && <p className="text-sm text-[#5c584e]">No notes yet.</p>}
              {post.comments.map((item) => (
                <div key={item.id} className="border-l-2 border-[#E01F26] pl-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    {item.authorName} · {item.authorRole.toLowerCase()} · {item.createdAt}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                </div>
              ))}
            </div>
            {canEdit(role) && (
              <form
                className="mt-3 space-y-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const result = await addComment(post.id, comment);
                  if (!result.ok) toast.error(result.error);
                  else {
                    setComment("");
                    router.refresh();
                  }
                }}
              >
                <Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="min-h-20" placeholder="Ask for a change, or sign off in words." />
                <Button type="submit" variant="outline" size="sm">
                  Add note
                </Button>
              </form>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Uploader({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <label className="inline-flex h-8 cursor-pointer items-center border border-[#0A0A0A] px-3 font-mono text-[10px] uppercase tracking-[0.14em]">
      {pending ? "Uploading" : "Upload"}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setPending(true);
          const body = new FormData();
          body.set("file", file);
          body.set("postId", postId);
          const response = await fetch("/api/upload", { method: "POST", body });
          const data = await response.json();
          setPending(false);
          if (!response.ok) toast.error(data.error || "Upload failed");
          else {
            toast.success(data.storage === "blob" ? "Uploaded to Vercel Blob." : "Uploaded on this server.");
            router.refresh();
          }
        }}
      />
    </label>
  );
}

function LibraryDialog({
  library,
  attached,
  onAttach,
}: {
  library: LibraryAsset[];
  attached: Set<string>;
  onAttach: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Library
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Media library</DialogTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {library.length === 0 && <p className="col-span-full text-sm">The library is empty. Upload a file first.</p>}
          {library.map((asset) => (
            <button
              key={asset.id}
              type="button"
              disabled={attached.has(asset.id)}
              className="border border-[#0A0A0A] text-left disabled:opacity-40"
              onClick={async () => {
                await onAttach(asset.id);
                setOpen(false);
              }}
            >
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.alt || asset.filename} className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center bg-[#0A0A0A] font-mono text-[10px] text-[#F1EBDD]">VIDEO</div>
              )}
              <div className="truncate px-2 py-1 text-[11px]">{attached.has(asset.id) ? "Attached" : asset.filename}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
