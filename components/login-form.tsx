"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, action, pending] = useActionState(authenticate, null);
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="redirectTo" value={callbackUrl} />
      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Email</span>
        <Input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Password</span>
        <Input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && <p className="text-sm text-[#E01F26]">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking" : "Enter the desk"}
      </Button>
    </form>
  );
}
