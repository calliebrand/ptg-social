import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/components/ui/input";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClass, "min-h-32 resize-y leading-relaxed", className)} {...props} />;
}
