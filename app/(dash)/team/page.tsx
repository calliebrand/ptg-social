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
        <ul className="border border-[#0A0A0A] bg-[#F7F3EA]">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between border-b border-[#0A0A0A]/10 px-4 py-3 text-sm">
              <span>{person.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{person.role.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <TeamManager people={people} actorRole={user.role} actorId={user.id} />
      )}
    </div>
  );
}
