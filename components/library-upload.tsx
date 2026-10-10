"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function LibraryUpload() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <label className="inline-flex h-10 cursor-pointer items-center rounded-lg bg-[#2F6BFF] px-4 text-sm font-medium text-white shadow-sm">
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
          const response = await fetch("/api/upload", { method: "POST", body });
          const data = await response.json();
          setPending(false);
          if (!response.ok) toast.error(data.error || "Upload failed");
          else {
            toast.success("Added to the library.");
            router.refresh();
          }
        }}
      />
    </label>
  );
}
