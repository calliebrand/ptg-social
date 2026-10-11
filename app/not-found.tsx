import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="card max-w-md p-8">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Not on the desk</h1>
        <p className="mt-3 text-sm text-mute">That page is not here.</p>
        <Link href="/" className="mt-5 inline-block text-sm text-ptg underline-offset-4 hover:underline">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
