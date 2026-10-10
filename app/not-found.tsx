import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#E9DFC9] px-4">
      <div className="max-w-md border border-[#0A0A0A] bg-[#F7F3EA] p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#767778]">404</div>
        <h1 className="font-display text-5xl">Not on the desk</h1>
        <p className="mt-2 text-sm">That page or post is not here.</p>
        <Link href="/" className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.16em] underline">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
