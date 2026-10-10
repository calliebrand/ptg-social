"use client";

import { useState } from "react";
import { publishDueNow } from "@/app/actions/posts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PublishButton() {
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="red"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await publishDueNow();
          setPending(false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setLines(
            result.results.length
              ? result.results.map((item) => `${item.title}: ${item.result}`)
              : ["Nothing was due."],
          );
        }}
      >
        {pending ? "Publishing" : "Publish due posts"}
      </Button>
      {lines.length > 0 && (
        <ul className="space-y-1 text-sm">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
