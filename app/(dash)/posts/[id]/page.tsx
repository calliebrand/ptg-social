import { notFound } from "next/navigation";
import { PostEditor } from "@/components/post-editor";
import { prisma } from "@/lib/db";
import { editorContext, postInclude, toEditorPost } from "@/lib/editor-data";
import { requireUser } from "@/lib/session";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [post, context] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: postInclude }),
    editorContext(),
  ]);
  if (!post) notFound();
  return <PostEditor post={toEditorPost(post)} role={user.role} {...context} />;
}
