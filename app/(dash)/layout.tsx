import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Shell user={{ name: user.name, email: user.email, role: user.role }}>
      {children}
    </Shell>
  );
}
