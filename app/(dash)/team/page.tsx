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
      <PageHeader
        kicker="The room"
        title="Team"
        lede="Owners and admins approve posts and invite the desk. Editors draft. Viewers can read the calendar and nothing else."
      />
      {!canManageUsers(user.role) ? (
        <ul className="border border-line bg-paper">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between border-b border-line px-3 py-2 text-[13px]">
              <span className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center bg-ink text-[10px] text-cream">{person.name.slice(0, 1).toUpperCase()}</span>
                {person.name}
              </span>
              <span className="micro text-mute">{person.role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <TeamManager people={people} actorRole={user.role} actorId={user.id} />
      )}
    </div>
  );
}
