import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-ink focus:ring-2 focus:ring-ptg/25 disabled:bg-canvas";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
