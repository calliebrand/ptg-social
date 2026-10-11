import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { chicagoStamp } from "@/lib/time";

export default async function ActivityPage() {
  const items = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        kicker="Who did what"
        title="Activity"
        lede="Approvals, edits, uploads, and publish attempts. The log is the paper trail for the desk."
      />
      <ol className="border border-line bg-paper">
        {items.map((item) => (
          <li key={item.id} className="grid gap-1 border-b border-line px-4 py-3 md:grid-cols-[180px_1fr]">
            <div className="text-xs text-mute">
              {chicagoStamp(item.createdAt)}
            </div>
            <div>
              <div className="text-sm">{item.detail || item.action}</div>
              <div className="text-xs text-mute">
                {item.action}
                {item.user?.name ? ` · ${item.user.name}` : ""}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-8 text-sm">No activity yet.</li>}
      </ol>
    </div>
  );
}
