"use client";

import { Crown, MoreHorizontal, ShieldCheck, UserCheck, Users, UserX } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MemberPermissions } from "./orgAccess";

export type MemberMenuAction = "role" | "teams" | "deactivate" | "reactivate" | "transfer";

type Props = {
  label: string;
  permissions: MemberPermissions;
  onSelect: (action: MemberMenuAction) => void;
};

type Item = { action: MemberMenuAction; label: string; icon: ReactNode; danger?: boolean; allowed: boolean };

// A per-member menu that renders in a fixed layer so the table's horizontal scroll never clips it.
export default function MemberActionsMenu({ label, permissions, onSelect }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const all: Item[] = [
    { action: "role", label: "Change role", icon: <ShieldCheck size={14} />, allowed: permissions.changeRole },
    { action: "teams", label: "Change teams", icon: <Users size={14} />, allowed: permissions.changeTeams },
    { action: "reactivate", label: "Reactivate", icon: <UserCheck size={14} />, allowed: permissions.reactivate },
    { action: "transfer", label: "Transfer ownership", icon: <Crown size={14} />, allowed: permissions.transferOwnership },
    { action: "deactivate", label: "Deactivate", icon: <UserX size={14} />, danger: true, allowed: permissions.deactivate },
  ];
  const items = all.filter((item) => item.allowed);

  useEffect(() => {
    if (!position) return;
    const close = (event: Event) => {
      if (event.type === "mousedown" && (menuRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node))) return;
      setPosition(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPosition(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [position]);

  if (items.length === 0) return <span className="text-xs text-slate-300">—</span>;

  const toggle = () => {
    if (position) return setPosition(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        aria-label={`Actions for ${label}`}
        className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <MoreHorizontal size={18} />
      </button>
      {position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`Actions for ${label}`}
          style={{ top: position.top, right: position.right }}
          className="fixed z-50 min-w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
        >
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              role="menuitem"
              onClick={() => {
                setPosition(null);
                onSelect(item.action);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium focus:outline-none ${item.danger ? "text-rose-600 hover:bg-rose-50 focus:bg-rose-50" : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
