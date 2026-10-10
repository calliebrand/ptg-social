import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full border border-[#0A0A0A] bg-white/70 px-3 py-2 text-sm text-[#0A0A0A] outline-none placeholder:text-[#767778] focus:bg-white focus:ring-2 focus:ring-[#E01F26]/40";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
