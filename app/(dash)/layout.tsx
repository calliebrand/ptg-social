import { Shell } from "@/components/shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [posts, media, team, scheduled, people, recent] = await Promise.all([
    prisma.post.count(),
    prisma.asset.count(),
    prisma.user.count(),
    prisma.post.count({ where: { scheduledAt: { not: null }, status: { not: "PUBLISHED" } } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 6 }),
    prisma.post.findMany({
      orderBy: [{ scheduledAt: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
      take: 40,
    }),
  ]);

  return (
    <Shell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ posts, media, team, scheduled }}
      people={people}
      posts={recent}
    >
      {children}
    </Shell>
  );
}
