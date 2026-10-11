"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
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

const iconProps = { className: "h-4 w-4 shrink-0", strokeWidth: 1.5 };

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
      <Link href="/" onClick={() => setOpen(false)} className="mb-8 block px-2">
        <span className="font-display block text-[1.7rem] leading-none text-cream">Preach</span>
        <span className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-cream/55">the gospel</span>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 text-[13px]",
                active ? "bg-ptg text-white" : "text-cream/75 hover:bg-white/5 hover:text-cream",
              )}
            >
              <Icon {...iconProps} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 px-2.5 text-[10px] uppercase tracking-[0.16em] text-cream/35">More</div>
      <nav className="mt-1 flex flex-col gap-0.5">
        {more.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 text-[13px]",
                active ? "bg-ptg text-white" : "text-cream/55 hover:bg-white/5 hover:text-cream",
              )}
            >
              <Icon {...iconProps} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-2 py-2 hover:bg-white/5">
          <span className="grid h-8 w-8 place-items-center border border-white/15 text-[11px] font-medium text-cream">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-cream">{user.name}</span>
            <span className="block text-[11px] capitalize text-cream/45">{user.role.toLowerCase()}</span>
          </span>
        </Link>
        <form action={logout} className="mt-1">
          <button className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-[13px] text-cream/55 hover:bg-white/5 hover:text-cream" type="submit">
            <LogOut {...iconProps} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col bg-sidebar px-3 py-5 md:flex">
          {nav}
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-sidebar/60" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[240px] flex-col bg-sidebar px-3 py-5">{nav}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-line bg-paper px-4 md:px-5">
            <button
              className="grid h-8 w-8 place-items-center border border-line text-ink md:hidden"
              onClick={() => setOpen(true)}
              type="button"
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-1">
                <span className="block h-px w-3.5 bg-current" />
                <span className="block h-px w-3.5 bg-current" />
                <span className="block h-px w-3.5 bg-current" />
              </span>
            </button>
            <div className="font-display text-lg leading-none text-ink">Preach the Gospel</div>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/activity"
                className="grid h-8 w-8 place-items-center text-mute hover:bg-ink/5 hover:text-ink"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <Link
                href="/account"
                className="grid h-8 w-8 place-items-center border border-ink bg-ink text-[11px] font-medium text-cream"
                aria-label="Account"
              >
                {initials}
              </Link>
            </div>
          </header>
          <main className="min-w-0 flex-1 px-4 py-5 md:px-5 md:py-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
