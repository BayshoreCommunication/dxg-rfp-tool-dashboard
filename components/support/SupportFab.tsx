"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getSupportUnreadCountAction } from "@/app/actions/supportDesk";
import SupportAgentIcon from "./SupportAgentIcon";

const STORAGE_KEY = "rfpilot.support-fab.position";
const DRAG_THRESHOLD_PX = 5;
const EDGE_PADDING = 8;

type Position = { x: number; y: number };
type StoredPosition = Position & { viewportWidth: number };
const VIEWPORT_TOLERANCE_PX = 200;

const clamp = (position: Position, width: number, height: number): Position => ({
  x: Math.min(Math.max(EDGE_PADDING, position.x), Math.max(EDGE_PADDING, window.innerWidth - width - EDGE_PADDING)),
  y: Math.min(Math.max(EDGE_PADDING, position.y), Math.max(EDGE_PADDING, window.innerHeight - height - EDGE_PADDING)),
});

const readStoredPosition = (): Position | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    // A spot chosen on a desktop window means nothing on a phone (and vice
    // versa): fall back to the default corner when the screen is very different.
    if (typeof parsed.viewportWidth === "number" && Math.abs(parsed.viewportWidth - window.innerWidth) > VIEWPORT_TOLERANCE_PX) {
      return null;
    }
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
};

/**
 * The always-available way to reach a person at DXG: a support-agent avatar
 * that sits bottom-right by default, gently floats, and can be dragged
 * anywhere (the spot is remembered per browser). A tap opens Support.
 */
export default function SupportFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const elementRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const onSupport = pathname === "/support" || pathname.startsWith("/support/");

  useEffect(() => {
    if (onSupport) return;
    let mounted = true;
    void getSupportUnreadCountAction().then((count) => {
      if (mounted) setUnread(count);
    });
    return () => {
      mounted = false;
    };
  }, [onSupport, pathname]);

  useEffect(() => {
    // Restore after paint so the server-rendered default never mismatches.
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredPosition();
      if (!stored) return;
      const element = elementRef.current;
      setPosition(clamp(stored, element?.offsetWidth ?? 64, element?.offsetHeight ?? 64));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const keepInView = () => {
      setPosition((current) => {
        if (!current) return current;
        const element = elementRef.current;
        return clamp(current, element?.offsetWidth ?? 64, element?.offsetHeight ?? 64);
      });
    };
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.startX;
    const dy = event.clientY - active.startY;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (!active.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    active.moved = true;
    setDragging(true);
    const element = event.currentTarget;
    setPosition(clamp({ x: active.originX + dx, y: active.originY + dy }, element.offsetWidth, element.offsetHeight));
  }, []);

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const active = gesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      gesture.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (active.moved) {
        setDragging(false);
        setPosition((current) => {
          if (current) {
            try {
              const stored: StoredPosition = { ...current, viewportWidth: window.innerWidth };
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
            } catch {
              // Remembering the spot is a convenience only.
            }
          }
          return current;
        });
        return;
      }
      router.push(unread > 0 ? "/support" : "/support?new=1");
    },
    [router, unread],
  );

  if (onSupport) return null;

  const label = unread > 0 ? `Support: ${unread} new repl${unread === 1 ? "y" : "ies"} from DXG` : "Need support? Message DXG";

  return (
    <button
      ref={elementRef}
      type="button"
      aria-label={label}
      title={`${label}. Drag to move.`}
      data-testid="support-fab"
      data-dragging={dragging ? "true" : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(unread > 0 ? "/support" : "/support?new=1");
        }
      }}
      style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
      className={`support-fab group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex touch-none select-none items-center gap-1.5 rounded-full bg-[#008ad2] p-1.5 text-[13px] font-bold sm:pr-3.5 text-white shadow-[0_12px_32px_-10px_rgba(0,138,210,0.75)] ring-2 ring-white/60 transition-colors hover:bg-[#0076b4] focus-visible:outline-none focus-visible:ring-[#008ad2]/40 sm:bottom-5 sm:right-5 dark:ring-[#07131c]/70 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <span className="support-fab-avatar relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#008ad2]">
        <SupportAgentIcon className="h-7 w-7" />
        <span className="support-fab-presence absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#008ad2] bg-emerald-400" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-[#008ad2]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
      <span className="hidden sm:inline">{unread > 0 ? "DXG replied" : "Need support?"}</span>
    </button>
  );
}
