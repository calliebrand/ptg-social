"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { CommandPalette, type PaletteCommand } from "@/components/command-palette";
import { Kbd } from "@/components/ui/button";
import { canEdit } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, count: null, section: "Work" },
  { href: "/calendar", label: "Content Calendar", icon: CalendarDays, count: "scheduled" as const, section: "Work" },
  { href: "/posts", label: "Posts", icon: SquarePen, count: "posts" as const, section: "Work" },
  { href: "/library", label: "Media", icon: ImageIcon, count: "media" as const, section: "Work" },
  { href: "/insights", label: "Analytics", icon: BarChart3, count: null, section: "Studio" },
  { href: "/team", label: "Team", icon: Users, count: "team" as const, section: "Studio" },
  { href: "/settings", label: "Settings", icon: Settings, count: null, section: "Studio" },
];

const more = [
  { href: "/templates", label: "Templates", icon: Type },
  { href: "/activity", label: "Activity", icon: Activity },
];

const crumbs: Record<string, string[]> = {
  "/": ["Desk"],
  "/calendar": ["Desk", "Content Calendar"],
  "/posts": ["Desk", "Posts"],
  "/library": ["Desk", "Media"],
  "/insights": ["Desk", "Analytics"],
  "/team": ["Desk", "Team"],
  "/settings": ["Desk", "Settings"],
  "/templates": ["Desk", "Templates"],
  "/activity": ["Desk", "Activity"],
  "/account": ["Desk", "Account"],
};

export function Shell({
  user,
  counts,
  people,
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
  const editable = canEdit(user.role as AppRole);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const commands: PaletteCommand[] = [
    ...links.map((link) => ({ href: link.href, label: link.label, group: "Pages" })),
    ...more.map((link) => ({ href: link.href, label: link.label, group: "Pages" })),
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

  const trail = pathname.startsWith("/posts/")
    ? ["Desk", "Posts", pathname === "/posts/new" ? "Create" : "Editor"]
    : crumbs[pathname] || ["Desk"];

  function Item({
    href,
    label,
    icon: Icon,
    count,
  }: {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number | null;
  }) {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex h-7 items-center gap-2 px-2 text-[13px]",
          active ? "bg-ptg text-white" : "text-cream/75 hover:bg-white/5 hover:text-cream",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {typeof count === "number" && (
          <span className={cn("font-mono text-[10px] tabular-nums", active ? "text-white/80" : "text-cream/40")}>{count}</span>
        )}
      </Link>
    );
  }

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={() => setOpen(false)} className="mb-5 block px-2">
        <span className="block text-[15px] font-medium tracking-[-0.03em] text-cream">Preach</span>
        <span className="font-serif block text-[15px] leading-none text-cream/70">the gospel</span>
      </Link>
      <div className="micro px-2 text-cream/35">Work</div>
      <nav className="mt-1 flex flex-col gap-px">
        {links
          .filter((link) => link.section === "Work")
          .map((link) => (
            <Item key={link.href} href={link.href} label={link.label} icon={link.icon} count={link.count ? counts[link.count] : null} />
          ))}
      </nav>
      <div className="micro mt-4 border-t border-white/10 px-2 pt-3 text-cream/35">Studio</div>
      <nav className="mt-1 flex flex-col gap-px">
        {links
          .filter((link) => link.section === "Studio")
          .map((link) => (
            <Item key={link.href} href={link.href} label={link.label} icon={link.icon} count={link.count ? counts[link.count] : null} />
          ))}
      </nav>
      <div className="micro mt-4 border-t border-white/10 px-2 pt-3 text-cream/35">More</div>
      <nav className="mt-1 flex flex-col gap-px">
        {more.map((link) => (
          <Item key={link.href} href={link.href} label={link.label} icon={link.icon} />
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-3">
        <Link href="/team" onClick={() => setOpen(false)} className="mb-3 flex items-center px-2">
          <span className="flex">
            {people.slice(0, 4).map((person, index) => (
              <span
                key={person.id}
                className="grid h-5 w-5 place-items-center border border-sidebar bg-cream text-[9px] font-medium text-ink"
                style={{ marginLeft: index === 0 ? 0 : -6 }}
                title={person.name}
              >
                {person.name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </span>
          <span className="ml-2 text-[11px] text-cream/45">{counts.team} on the desk</span>
        </Link>
        <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5">
          <span className="grid h-6 w-6 place-items-center border border-white/15 text-[10px] text-cream">{initials}</span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] text-cream">{user.name}</span>
            <span className="block text-[11px] capitalize text-cream/45">{user.role.toLowerCase()}</span>
          </span>
        </Link>
        <form action={logout}>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-[13px] text-cream/55 hover:text-cream" type="submit">
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col bg-sidebar px-2 py-4 md:flex">{nav}</aside>
        {open && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-sidebar/60" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="relative flex h-full w-[232px] flex-col bg-sidebar px-2 py-4">{nav}</aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-11 items-center gap-2 border-b border-line bg-paper/90 px-3 backdrop-blur-sm md:px-4">
            <button
              className="grid h-7 w-7 place-items-center border border-line md:hidden"
              onClick={() => setOpen(true)}
              type="button"
              aria-label="Open menu"
            >
              <span className="flex flex-col gap-1">
                <span className="block h-px w-3 bg-current" />
                <span className="block h-px w-3 bg-current" />
                <span className="block h-px w-3 bg-current" />
              </span>
            </button>
            <nav className="hidden min-w-0 items-center gap-1 text-[12px] text-mute md:flex" aria-label="Breadcrumb">
              {trail.map((crumb, index) => (
                <span key={crumb} className="flex items-center gap-1">
                  {index > 0 && <span className="text-line">/</span>}
                  <span className={index === trail.length - 1 ? "text-ink" : ""}>{crumb}</span>
                </span>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="ml-auto flex h-7 w-[220px] items-center justify-between border border-line bg-canvas px-2 text-[12px] text-mute hover:border-ink/30"
            >
              Search
              <Kbd>⌘K</Kbd>
            </button>
            <Link href="/activity" className="grid h-7 w-7 place-items-center text-mute hover:bg-canvas hover:text-ink" aria-label="Notifications">
              <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
            <Link href="/account" className="grid h-7 w-7 place-items-center bg-ink text-[10px] text-cream" aria-label="Account">
              {initials}
            </Link>
          </header>
          <main className="min-w-0 flex-1 px-3 py-4 md:px-4">{children}</main>
        </div>
      </div>
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands} />
    </div>
  );
}
