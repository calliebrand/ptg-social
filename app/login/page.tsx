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
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between bg-sidebar px-6 py-8 text-cream lg:px-14 lg:py-12">
        <div className="text-[11px] uppercase tracking-[0.2em] text-ptg">Houston</div>
        <div className="py-12">
          <h1 className="font-display text-6xl leading-[0.82] text-cream sm:text-7xl lg:text-8xl">
            Preach
            <br />
            the gospel
          </h1>
          <div className="mt-6 h-px w-14 bg-ptg" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream/70">
            The desk for a retro Christian label. Scripture, product, and the week ahead, on one calendar.
          </p>
        </div>
        <div className="text-xs tracking-wide text-cream/45">@preachthegospel.store</div>
      </section>
      <section className="flex items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-4xl leading-none text-ink">Sign in</h2>
          <p className="mt-3 text-sm leading-relaxed text-mute">
            Drafts stay drafts until an owner or admin approves them.
          </p>
          <LoginForm callbackUrl={params.callbackUrl || "/"} />
          {demo && (
            <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-mute">
              Local login {process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store"} ·{" "}
              {process.env.SEED_OWNER_PASSWORD || "see README"}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
