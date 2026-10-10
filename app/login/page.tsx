import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const params = await searchParams;
  const demo = process.env.SHOW_DEMO_LOGIN === "true";

  return (
    <main className="grid min-h-screen place-items-center bg-[#E9DFC9] px-4 py-10">
      <div className="w-full max-w-md border border-[#0A0A0A] bg-[#F7F3EA] p-8 shadow-[8px_8px_0_#0A0A0A]">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#767778]">No. 00 · Houston</div>
        <h1 className="mt-3 font-display text-6xl leading-[0.85]">PREACH</h1>
        <p className="font-script text-3xl text-[#E01F26]">the gospel</p>
        <p className="mt-4 text-sm leading-relaxed">
          The social desk for @preachthegospel.store. Drafts stay drafts until an owner approves them.
        </p>
        <LoginForm callbackUrl={params.callbackUrl || "/"} />
        {demo && (
          <p className="mt-6 border-t border-[#0A0A0A] pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-[#5c584e]">
            Local login {process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store"} ·{" "}
            {process.env.SEED_OWNER_PASSWORD || "see README"}
          </p>
        )}
      </div>
    </main>
  );
}
