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
    <main className="grid min-h-screen place-items-center bg-[#f4f6f8] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E01F26] text-sm font-bold text-white">P</span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Preach the Gospel</h1>
            <p className="text-sm text-slate-500">Social desk · Houston</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Drafts stay drafts until an owner or admin approves them.
        </p>
        <LoginForm callbackUrl={params.callbackUrl || "/"} />
        {demo && (
          <p className="mt-6 border-t border-slate-200 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-slate-500">
            Local login {process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store"} ·{" "}
            {process.env.SEED_OWNER_PASSWORD || "see README"}
          </p>
        )}
      </div>
    </main>
  );
}
