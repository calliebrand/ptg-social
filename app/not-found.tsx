import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="max-w-md border border-line bg-paper p-8">
        <div className="text-[11px] uppercase tracking-[0.16em] text-mute">404</div>
        <h1 className="mt-2 text-[28px] font-medium tracking-[-0.04em]">Not on the desk</h1>
        <p className="mt-3 text-sm text-mute">That page or post is not here.</p>
        <Link href="/" className="mt-5 inline-block text-sm text-ptg underline-offset-4 hover:underline">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
