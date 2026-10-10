import { AccountForm } from "@/components/account-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function AccountPage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({ where: { id: user.id } });
  return (
    <div>
      <PageHeader
        kicker="You"
        title="Account"
        lede="Change the name on the activity log, or set a new password."
      />
      <AccountForm name={record?.name || user.name} email={user.email} role={user.role} />
    </div>
  );
}
