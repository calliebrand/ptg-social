import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "field placeholder:text-mute disabled:bg-canvas";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClass, className)} {...props} />;
}
