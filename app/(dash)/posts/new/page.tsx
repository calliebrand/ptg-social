import { PostEditor } from "@/components/post-editor";
import { editorContext } from "@/lib/editor-data";
import { requireUser } from "@/lib/session";
import { canEdit } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function NewPostPage() {
  const user = await requireUser();
  if (!canEdit(user.role)) redirect("/posts");
  const context = await editorContext();
  return <PostEditor post={null} role={user.role} {...context} />;
}
