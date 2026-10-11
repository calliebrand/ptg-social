import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { TeamManager } from "@/components/team-manager";
import { requireUser } from "@/lib/session";
import { canManageUsers } from "@/lib/permissions";

export default async function TeamPage() {
  const user = await requireUser();
  const people = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <div>
      <PageHeader title="Team" />
      {!canManageUsers(user.role) ? (
        <ul className="card overflow-hidden">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between border-b border-line px-5 py-4 text-sm last:border-0">
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ptg-soft text-xs font-semibold text-ptg">{person.name.slice(0, 1).toUpperCase()}</span>
                {person.name}
              </span>
              <span className="text-sm capitalize text-mute">{person.role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <TeamManager people={people} actorRole={user.role} actorId={user.id} />
      )}
    </div>
  );
}
