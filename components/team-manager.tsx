"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUser, deleteUser, resetUserPassword, updateUserRole } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Input, fieldClass } from "@/components/ui/input";
import type { Role } from "@prisma/client";
import { canAssignRole, type AppRole } from "@/lib/permissions";

type Person = { id: string; name: string; email: string; role: Role };

export function TeamManager({ people, actorRole, actorId }: { people: Person[]; actorRole: AppRole; actorId: string }) {
  const [state, action, pending] = useActionState(createUser, null);
  const router = useRouter();
  const [reset, setReset] = useState<{ email: string; tempPassword: string } | null>(null);
  const roles: Role[] = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];

  return (
    <div className="space-y-6">
      <form action={action} className="card grid gap-3 p-5 md:grid-cols-4">
        <Input name="name" placeholder="Name" required />
        <Input name="email" type="email" placeholder="Email" required />
        <select name="role" defaultValue="EDITOR" className={fieldClass}>
          {roles.filter((role) => canAssignRole(actorRole, role)).map((role) => (
            <option key={role} value={role}>{role.toLowerCase()}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>Add person</Button>
        {state?.error && <p className="md:col-span-4 text-sm text-[#E01F26]">{state.error}</p>}
        {state?.tempPassword && (
          <p className="card md:col-span-4 p-3 text-sm">
            {state.email} can sign in with temporary password <span className="font-mono">{state.tempPassword}</span>. It is shown once.
          </p>
        )}
      </form>

      {reset && (
        <p className="card p-3 text-sm">
          New password for {reset.email}: <span className="font-mono">{reset.tempPassword}</span>
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line text-xs font-medium text-mute">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-b border-line">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-ptg-soft text-xs font-semibold text-ptg">{person.name.slice(0, 1).toUpperCase()}</span>
                    {person.name}{person.id === actorId ? " (you)" : ""}
                  </span>
                </td>
                <td className="px-3 py-3">{person.email}</td>
                <td className="px-3 py-3">
                  <select
                    className={fieldClass}
                    defaultValue={person.role}
                    disabled={!canAssignRole(actorRole, person.role)}
                    onChange={async (event) => {
                      const result = await updateUserRole(person.id, event.target.value as Role);
                      if (result && "error" in result && result.error) toast.error(result.error);
                      else toast.success("Role saved.");
                      router.refresh();
                    }}
                  >
                    {roles.map((role) => (
                      <option key={role} value={role} disabled={!canAssignRole(actorRole, role)}>
                        {role.toLowerCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-xs font-medium underline"
                      onClick={async () => {
                        const result = await resetUserPassword(person.id);
                        if (result.error || !result.tempPassword) toast.error(result.error || "Could not reset.");
                        else setReset({ email: result.email || person.email, tempPassword: result.tempPassword });
                      }}
                    >
                      Reset password
                    </button>
                    {person.id !== actorId && (
                      <button
                        type="button"
                        className="text-xs font-medium text-[#E01F26]"
                        onClick={async () => {
                          if (!confirm(`Remove ${person.name}?`)) return;
                          const result = await deleteUser(person.id);
                          if (result.error) toast.error(result.error);
                          else router.refresh();
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
