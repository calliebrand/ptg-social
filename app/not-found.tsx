import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f6f8] px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
        <div className="text-xs font-medium text-slate-400">404</div>
        <h1 className="text-3xl font-semibold tracking-tight">Not on the desk</h1>
        <p className="mt-2 text-sm">That page or post is not here.</p>
        <Link href="/" className="mt-4 inline-block text-xs font-medium underline">
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
