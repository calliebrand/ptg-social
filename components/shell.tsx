"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Settings,
  SquarePen,
  Type,
  Users,
  Activity,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Content Calendar", icon: CalendarDays },
  { href: "/posts", label: "Posts", icon: SquarePen },
  { href: "/library", label: "Media", icon: ImageIcon },
  { href: "/insights", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

const more = [
  { href: "/templates", label: "Templates", icon: Type },
  { href: "/activity", label: "Activity", icon: Activity },
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
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="mb-6 flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E01F26] text-sm font-bold text-white">
          P
        </span>
        <span>
          <span className="block text-[15px] font-semibold leading-tight text-white">Preach</span>
          <span className="block text-xs text-white/60">the gospel</span>
        </span>
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                active ? "bg-[#2F6BFF] text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 px-3 text-[11px] font-medium uppercase tracking-wider text-white/35">More</div>
      <nav className="mt-2 flex flex-col gap-1">
        {more.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block text-xs capitalize text-white/50">{user.role.toLowerCase()}</span>
          </span>
        </Link>
        <form action={logout} className="mt-1">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white" type="submit">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#0e2340] p-4 md:flex">
          {nav}
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-[#0e2340]/50" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[260px] flex-col bg-[#0e2340] p-4 shadow-2xl">{nav}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:px-6">
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
              onClick={() => setOpen(true)}
              type="button"
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </span>
            </button>
            <div className="text-sm font-medium text-slate-500">Preach the Gospel</div>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/activity"
                className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Link>
              <Link
                href="/account"
                className="grid h-10 w-10 place-items-center rounded-full bg-[#0e2340] text-xs font-semibold text-white"
                aria-label="Account"
              >
                {initials}
              </Link>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
