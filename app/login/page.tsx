import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
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
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12">
      <div className="card w-full max-w-[420px] p-8">
        <div className="flex justify-center">
          <BrandLogo height={48} />
        </div>
        <h1 className="mt-8 text-[28px] font-semibold tracking-[-0.03em]">Sign in</h1>
        <LoginForm callbackUrl={params.callbackUrl || "/"} />
        {demo && (
          <p className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-mute">
            {process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store"}
            <br />
            {process.env.SEED_OWNER_PASSWORD || "see README"}
          </p>
        )}
      </div>
    </main>
  );
}
