"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type PaletteCommand = { href: string; label: string; group: string };

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter((command) => !q || `${command.label} ${command.group}`.toLowerCase().includes(q)).slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const id = window.setTimeout(() => input.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#111827]/30 px-4 pt-[14vh]" onMouseDown={() => onOpenChange(false)}>
      <div
        className="modal-panel card w-full max-w-[560px] overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages and posts"
          className="h-12 w-full border-0 bg-transparent px-4 text-sm outline-none placeholder:text-mute"
          onKeyDown={(event) => {
            if (event.key === "Escape") onOpenChange(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => Math.min(value + 1, Math.max(results.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => Math.max(value - 1, 0));
            }
            if (event.key === "Enter" && results[active]) go(results[active].href);
          }}
        />
        <div className="border-t border-line">
          {results.length === 0 && <p className="px-3 py-6 text-[13px] text-mute">No matches.</p>}
          {results.map((command, index) => {
            const showGroup = index === 0 || results[index - 1].group !== command.group;
            return (
              <div key={command.href + command.label}>
                {showGroup && <div className="px-4 pb-1 pt-3 text-xs font-medium text-mute">{command.group}</div>}
                <button
                  type="button"
                  className={cn("flex h-8 w-full items-center px-3 text-left text-[13px]", index === active ? "bg-canvas" : "hover:bg-canvas")}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(command.href)}
                >
                  {command.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
