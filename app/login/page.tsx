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
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between bg-sidebar px-6 py-8 text-cream lg:px-12 lg:py-10">
        <div className="micro text-ptg">Houston</div>
        <div className="py-10">
          <h1 className="max-w-md text-[52px] font-medium leading-[0.92] tracking-[-0.045em] text-cream sm:text-[64px]">
            Preach
            <br />
            <span className="font-serif text-cream/90">the gospel.</span>
          </h1>
          <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-cream/65">
            Schedule the week, approve the copy, and keep the feed on one desk.
          </p>
        </div>
        <div className="text-[12px] text-cream/45">@preachthegospel.store</div>
      </section>
      <section className="flex items-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-sm">
          <div className="micro text-mute">Account</div>
          <h2 className="mt-1 text-[22px] font-medium tracking-[-0.035em]">Sign in</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-mute">
            Drafts stay drafts until an owner or admin approves them.
          </p>
          <LoginForm callbackUrl={params.callbackUrl || "/"} />
          {demo && (
            <p className="mt-5 border-t border-line pt-3 text-[12px] leading-relaxed text-mute">
              Local login {process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store"} ·{" "}
              {process.env.SEED_OWNER_PASSWORD || "see README"}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
