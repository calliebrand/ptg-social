"use client";

import { useActionState } from "react";
import { updateAccount } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountForm({ name, email, role }: { name: string; email: string; role: string }) {
  const [state, action, pending] = useActionState(updateAccount, null);
  return (
    <form action={action} className="max-w-md space-y-3 border border-[#0A0A0A] bg-[#F7F3EA] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#767778]">
        {email} · {role.toLowerCase()}
      </p>
      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Name</span>
        <Input name="name" required defaultValue={name} />
      </label>
      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Current password</span>
        <Input name="currentPassword" type="password" autoComplete="current-password" />
      </label>
      <label className="block space-y-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">New password</span>
        <Input name="nextPassword" type="password" autoComplete="new-password" />
      </label>
      {state?.error && <p className="text-sm text-[#E01F26]">{state.error}</p>}
      {state?.ok && <p className="text-sm">Saved.</p>}
      <Button type="submit" disabled={pending}>
        Save
      </Button>
    </form>
  );
}
