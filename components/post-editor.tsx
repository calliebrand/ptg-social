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
import { X } from "lucide-react";
import { InstagramMark } from "@/components/instagram-mark";
import { captionStats, IG_CAPTION_LIMIT, IG_HASHTAG_LIMIT, uniqueHashtags } from "@/lib/caption";
import { canApprove, canEdit, type AppRole } from "@/lib/permissions";
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
      <div className="text-xs font-medium text-mute">{label}</div>
      {children}
      {hint && <p className="text-xs text-mute">{hint}</p>}
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

  const when = [form.scheduledDate, form.scheduledTime].filter(Boolean).join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#111827]/30 p-3 md:p-4">
      <div className="modal-panel flex h-full w-full max-w-[1080px] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-[0_24px_80px_rgba(16,24,40,0.18)]">
        <header className="flex items-center justify-between gap-3 rounded-t-2xl bg-paper px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-[-0.03em] text-ink">{form.title || "Create post"}</h1>
            {post && <StatusBadge status={post.status} />}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {editable && (
              <Button type="button" onClick={onSave} disabled={saving}>
                {saving ? "Saving" : post ? "Save" : "Create draft"}
              </Button>
            )}
            <Link href="/calendar" aria-label="Close" className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:bg-canvas">
              <X className="h-4 w-4" />
            </Link>
          </div>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4 p-4 md:p-5">

        {post?.publishError && (
          <div className="rounded-sm border border-[#E01F26]/40 bg-red-50 px-4 py-3 text-sm">
            <span className="text-xs font-medium text-[#E01F26]">Publish note</span>
            <p className="mt-1">{post.publishError}</p>
          </div>
        )}
        {post?.igPermalink && (
          <a className="inline-block text-sm underline" href={post.igPermalink} target="_blank" rel="noreferrer">
            View on Instagram
          </a>
        )}
        {post?.approvedByName && (
          <p className="text-xs text-mute">
            Approved by {post.approvedByName}
            {post.approvedAtLabel ? ` · ${post.approvedAtLabel} CT` : ""}
          </p>
        )}

        {post && editable && (
          <div className="card flex flex-wrap gap-2 p-4">
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
            {dirty && <span className="self-center text-xs text-mute">Save before changing status.</span>}
          </div>
        )}

        <section className="card space-y-4 p-5">
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
            <Field label="Asset status">
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

        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-medium text-mute">Caption</div>
            {editable && templates.length > 0 && (
              <select
                className="field h-9 w-auto text-xs"
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
                  className="rounded-sm border border-line bg-canvas px-2.5 py-1 text-xs text-mute"
                  onClick={() => update("hashtags", uniqueHashtags(form.hashtags, set.tags))}
                >
                  {set.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs font-medium text-mute">
            <span className={cn(stats.overCharacters && "text-[#E01F26]")}>
              {stats.characters} / {IG_CAPTION_LIMIT} characters
            </span>
            <span className={cn(stats.overHashtags && "text-[#E01F26]")}>
              {stats.hashtagCount} / {IG_HASHTAG_LIMIT} hashtags
            </span>
          </div>
        </section>

        <section className="card grid gap-4 p-5 md:grid-cols-2">
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
          <section className="card space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-mute">Carousel slides</div>
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
              <div key={index} className="grid gap-2 rounded-sm border border-line p-3 md:grid-cols-[140px_1fr_auto]">
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
              <p className="text-sm text-mute">Add a line of copy for each swipe. Images are attached below, in order.</p>
            )}
          </section>
        )}

        {post && (
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-mute">Media</div>
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
              <p className="text-sm text-mute">No file on this post yet. Upload one or pull it from the library.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {post.media.map((item, index) => (
                <div key={item.id} className="card overflow-hidden">
                  {item.asset.mimeType.startsWith("video/") ? (
                    <video src={item.asset.url} className="aspect-[4/5] w-full bg-ink object-cover" controls />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.asset.url} alt={item.asset.alt || item.asset.filename} className="aspect-[4/5] w-full object-cover" />
                  )}
                  <div className="flex items-center justify-between gap-2 p-2">
                    <div className="truncate text-xs">{item.asset.filename}</div>
                    {editable && (
                      <div className="flex gap-1">
                        <button type="button" className="text-xs text-mute" onClick={() => moveAsset(post.id, item.asset.id, "up").then(() => router.refresh())} disabled={index === 0}>
                          Up
                        </button>
                        <button type="button" className="text-xs text-mute" onClick={() => moveAsset(post.id, item.asset.id, "down").then(() => router.refresh())}>
                          Down
                        </button>
                        <button type="button" className="text-xs text-[#E01F26]" onClick={() => detachAsset(post.id, item.asset.id).then(() => router.refresh())}>
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

      <aside className="space-y-4 border-t border-line p-4 lg:border-l lg:border-t-0 md:p-5">
        <div className="text-sm font-medium text-ink">Preview</div>
        <div className="mx-auto w-[280px] rounded-[2rem] border-[8px] border-[#111827] bg-paper">
          <div className="mx-auto mt-2 h-4 w-24 rounded-full bg-[#111827]" />
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="grid h-7 w-7 place-items-center rounded-sm bg-[#E01F26] text-[9px] font-bold text-white">P</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">preachthegospel.store</div>
              <div className="text-[10px] text-mute">Instagram</div>
            </div>
            <InstagramMark className="ml-auto h-4 w-4 text-ink" />
          </div>
          {cover && cover.asset.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.asset.url} alt="" className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-canvas p-6 text-center">
              <div>
                <div className="text-2xl font-semibold leading-tight text-ink">{form.quoteText || form.title || "Quote"}</div>
                {form.bibleReference && (
                  <div className="mt-3 text-xs text-mute">{form.bibleReference}</div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2 px-3 py-3 text-[11px] leading-relaxed">
            <div className="flex gap-2 text-mute">
              <InstagramMark className="h-3.5 w-3.5" />
            </div>
            <p className="line-clamp-5 whitespace-pre-wrap">
              <span className="font-semibold">preachthegospel.store </span>
              {stats.combined || "Caption lands here."}
            </p>
            <p className="text-[10px] text-mute">{when || "No date yet"}</p>
          </div>
        </div>

        {post && (
          <div className="card p-4">
            <div className="text-sm font-medium text-ink">Notes</div>
            <div className="mt-3 space-y-3">
              {post.comments.length === 0 && <p className="text-sm text-mute">No notes yet.</p>}
              {post.comments.map((item) => (
                <div key={item.id} className="border-l-2 border-[#E01F26] pl-3">
                  <div className="text-[11px] text-mute">
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
      </div>
    </div>
  );
}

function Uploader({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <label className="btn btn-subtle cursor-pointer">
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
              className="overflow-hidden rounded-sm border border-line text-left disabled:opacity-40"
              onClick={async () => {
                await onAttach(asset.id);
                setOpen(false);
              }}
            >
              {asset.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.url} alt={asset.alt || asset.filename} className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square place-items-center bg-ink text-[10px] text-white">VIDEO</div>
              )}
              <div className="truncate px-2 py-1 text-[11px]">{attached.has(asset.id) ? "Attached" : asset.filename}</div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
