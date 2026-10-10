"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Desk" },
  { href: "/calendar", label: "Calendar" },
  { href: "/posts", label: "Posts" },
  { href: "/library", label: "Library" },
  { href: "/templates", label: "Templates" },
  { href: "/insights", label: "Insights" },
  { href: "/activity", label: "Activity" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Instagram" },
];

export function Shell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cn(
              "border-l-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em]",
              active
                ? "border-[#E01F26] bg-[#0A0A0A] text-[#F1EBDD]"
                : "border-transparent text-[#0A0A0A] hover:border-[#0A0A0A]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#E9DFC9] text-[#0A0A0A]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[#0A0A0A] bg-[#F7F3EA] p-5 md:flex">
          <Link href="/" className="mb-8 block">
            <div className="font-display text-4xl leading-none tracking-tight">PREACH</div>
            <div className="font-script text-2xl leading-none text-[#E01F26]">the gospel</div>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[#767778]">
              Social desk · Houston
            </div>
          </Link>
          {nav}
          <div className="mt-auto border-t border-[#0A0A0A] pt-4">
            <Link href="/account" className="block">
              <div className="font-display text-xl leading-none">{user.name}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#767778]">
                {user.role.toLowerCase()}
              </div>
            </Link>
            <form action={logout} className="mt-3">
              <button className="font-mono text-[10px] uppercase tracking-[0.16em] underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[#0A0A0A] bg-[#F7F3EA] px-4 py-3 md:hidden">
            <Link href="/" className="font-display text-2xl leading-none">
              PREACH
            </Link>
            <button
              className="border border-[#0A0A0A] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em]"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              {open ? "Close" : "Menu"}
            </button>
          </header>
          {open && <div className="border-b border-[#0A0A0A] bg-[#F7F3EA] p-4 md:hidden">{nav}</div>}
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
