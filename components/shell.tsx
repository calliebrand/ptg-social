"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  Search,
  Settings,
  SquarePen,
  Sun,
  Type,
  Users,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { CommandPalette, type PaletteCommand } from "@/components/command-palette";
import { Kbd } from "@/components/ui/button";
import { canEdit } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const contentLinks = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays, countKey: "scheduled" as const },
  { href: "/posts", label: "Posts", icon: SquarePen, countKey: "posts" as const },
  { href: "/library", label: "Media", icon: ImageIcon, countKey: "media" as const },
];

const rest: { href: string; label: string; icon: typeof Users; countKey?: "team" }[] = [
  { href: "/insights", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users, countKey: "team" },
  { href: "/templates", label: "Templates", icon: Type },
  { href: "/activity", label: "Activity", icon: Activity },
];

export function Shell({
  user,
  counts,
  posts,
  children,
}: {
  user: { name: string; email: string; role: string };
  counts: { posts: number; media: number; team: number; scheduled: number };
  people: { id: string; name: string }[];
  posts: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [contentOpen, setContentOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const editable = canEdit(user.role as AppRole);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const commands: PaletteCommand[] = [
    { href: "/", label: "Dashboard", group: "Pages" },
    ...contentLinks.map((link) => ({ href: link.href, label: link.label, group: "Pages" })),
    ...rest.map((link) => ({ href: link.href, label: link.label, group: "Pages" })),
    { href: "/settings", label: "Settings", group: "Pages" },
    ...(editable ? [{ href: "/posts/new", label: "Create post", group: "Actions" }] : []),
    ...posts.map((post) => ({ href: `/posts/${post.id}`, label: post.title, group: "Posts" })),
  ];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((value) => !value);
        return;
      }
      if (palette || typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "c" && editable) {
        event.preventDefault();
        router.push("/posts/new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, palette, router]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  function active(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function Item({
    href,
    label,
    icon: Icon,
    count,
    nested,
  }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
    nested?: boolean;
  }) {
    const on = active(href);
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        title={collapsed ? label : undefined}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium",
          nested && !collapsed && "ml-3",
          on ? "bg-ptg-soft text-ptg" : "text-mute hover:bg-canvas hover:text-ink",
          collapsed && "justify-center px-0",
        )}
      >
        {on && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-ptg" />}
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
        {!collapsed && typeof count === "number" && (
          <span className={cn("text-xs tabular-nums", on ? "text-ptg/70" : "text-mute")}>{count}</span>
        )}
      </Link>
    );
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className={cn("mb-6 flex items-center gap-2 px-1", collapsed && "flex-col")}>
        <Link href="/" onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ptg text-sm font-semibold text-white">P</span>
          {!collapsed && <span className="truncate text-[15px] font-semibold tracking-[-0.02em] text-ink">Preach</span>}
        </Link>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mute hover:bg-canvas hover:text-ink"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((value) => !value)}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <nav className="flex flex-col gap-1">
        <Item href="/" label="Dashboard" icon={LayoutDashboard} />
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-mute hover:bg-canvas hover:text-ink",
            collapsed && "justify-center px-0",
          )}
          onClick={() => setContentOpen((value) => !value)}
          aria-expanded={contentOpen}
        >
          <SquarePen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          {!collapsed && <span className="flex-1 text-left">Content</span>}
          {!collapsed && (
            <ChevronDown className={cn("h-4 w-4 text-mute transition-transform", contentOpen && "rotate-180")} />
          )}
        </button>
        {(contentOpen || collapsed) &&
          contentLinks.map((link) => (
            <Item
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
              count={counts[link.countKey]}
              nested={!collapsed}
            />
          ))}
        {rest.map((link) => (
          <Item
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            count={link.countKey ? counts[link.countKey] : undefined}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <Item href="/settings" label="Settings" icon={Settings} />
        <form action={logout}>
          <button
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-mute hover:bg-canvas hover:text-ink",
              collapsed && "justify-center px-0",
            )}
            type="submit"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {!collapsed && "Sign out"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-sidebar px-3 py-5 md:flex",
            collapsed ? "w-[76px]" : "w-[248px]",
          )}
        >
          {nav}
        </aside>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-[#111827]/30" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[260px] flex-col bg-sidebar px-3 py-5 shadow-xl">{nav}</aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-canvas px-4 md:px-6">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-paper text-ink md:hidden"
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
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-2 rounded-xl border border-line bg-paper px-3 text-sm text-mute shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate text-left">Search</span>
              <Kbd>⌘K</Kbd>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:bg-paper hover:text-ink"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <Link
              href="/activity"
              className="grid h-10 w-10 place-items-center rounded-xl text-mute hover:bg-paper hover:text-ink"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </Link>
            <Link
              href="/account"
              className="grid h-10 w-10 place-items-center rounded-full bg-ptg text-xs font-semibold text-white"
              aria-label="Account"
            >
              {initials}
            </Link>
          </header>
          <main className="min-w-0 flex-1 px-4 pb-10 md:px-6">{children}</main>
        </div>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands} />
    </div>
  );
}
