import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#2F6BFF] focus:ring-2 focus:ring-[#2F6BFF]/20 disabled:bg-slate-50";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
