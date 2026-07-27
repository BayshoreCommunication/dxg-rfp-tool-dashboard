"use client";

import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type PopupPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

const VIEWPORT_MARGIN = 12;
const DEFAULT_LEFT = 102;
const DEFAULT_BOTTOM = 135;
const FALLBACK_WIDTH = 384;
const FALLBACK_HEIGHT = 460;
const POSITION_STORAGE_KEY = "rfpilot:ai-assistant-position:v1";

const positionsMatch = (
  first: PopupPosition | null,
  second: PopupPosition,
) => first?.x === second.x && first.y === second.y;

const readStoredPosition = (): PopupPosition | null => {
  try {
    const value = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<PopupPosition>;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) {
      window.localStorage.removeItem(POSITION_STORAGE_KEY);
      return null;
    }
    return { x: parsed.x as number, y: parsed.y as number };
  } catch {
    return null;
  }
};

const persistPosition = (position: PopupPosition | null) => {
  try {
    if (position) {
      window.localStorage.setItem(
        POSITION_STORAGE_KEY,
        JSON.stringify(position),
      );
    } else {
      window.localStorage.removeItem(POSITION_STORAGE_KEY);
    }
  } catch {
    // Position memory is a progressive enhancement.
  }
};

export default function useDraggablePopup(
  popupRef: RefObject<HTMLElement | null>,
) {
  const positionRef = useRef<PopupPosition | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const modifiedRef = useRef(false);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [positionModified, setPositionModified] = useState(false);

  const popupSize = useCallback(() => {
    const rect = popupRef.current?.getBoundingClientRect();
    return {
      width:
        rect?.width ||
        Math.min(
          FALLBACK_WIDTH,
          Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2),
        ),
      height:
        rect?.height ||
        Math.min(
          FALLBACK_HEIGHT,
          Math.max(0, window.innerHeight - VIEWPORT_MARGIN * 2),
        ),
    };
  }, [popupRef]);

  const clamp = useCallback(
    (candidate: PopupPosition): PopupPosition => {
      const { width, height } = popupSize();
      const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN);
      const maxY = Math.max(
        VIEWPORT_MARGIN,
        window.innerHeight - height - VIEWPORT_MARGIN,
      );
      return {
        x: Math.round(
          Math.min(maxX, Math.max(VIEWPORT_MARGIN, candidate.x)),
        ),
        y: Math.round(
          Math.min(maxY, Math.max(VIEWPORT_MARGIN, candidate.y)),
        ),
      };
    },
    [popupSize],
  );

  const defaultPosition = useCallback((): PopupPosition => {
    const { height } = popupSize();
    return clamp({
      x: DEFAULT_LEFT,
      y: window.innerHeight - height - DEFAULT_BOTTOM,
    });
  }, [clamp, popupSize]);

  const updatePosition = useCallback(
    (next: PopupPosition, remember = false) => {
      const safePosition = clamp(next);
      positionRef.current = safePosition;
      setPosition((current) =>
        positionsMatch(current, safePosition) ? current : safePosition,
      );

      if (remember) {
        modifiedRef.current = true;
        setPositionModified(true);
        persistPosition(safePosition);
      }
      return safePosition;
    },
    [clamp],
  );

  const resetPosition = useCallback(() => {
    modifiedRef.current = false;
    setPositionModified(false);
    persistPosition(null);
    updatePosition(defaultPosition());
  }, [defaultPosition, updatePosition]);

  useLayoutEffect(() => {
    const initializeFrame = window.requestAnimationFrame(() => {
      const stored = readStoredPosition();
      modifiedRef.current = Boolean(stored);
      setPositionModified(Boolean(stored));
      updatePosition(stored ?? defaultPosition());
    });

    const handleResize = () => {
      const next = modifiedRef.current
        ? clamp(positionRef.current ?? defaultPosition())
        : defaultPosition();
      updatePosition(next, modifiedRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(initializeFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [clamp, defaultPosition, updatePosition]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      const rect = popupRef.current?.getBoundingClientRect();
      if (!rect) return;

      const current = clamp({ x: rect.left, y: rect.top });
      positionRef.current = current;
      setPosition(current);
      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
      event.preventDefault();
    },
    [clamp, popupRef],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (
        Math.abs(event.clientX - drag.startX) > 2 ||
        Math.abs(event.clientY - drag.startY) > 2
      ) {
        drag.moved = true;
      }
      updatePosition({
        x: event.clientX - drag.offsetX,
        y: event.clientY - drag.offsetY,
      });
      event.preventDefault();
    },
    [updatePosition],
  );

  const finishPointerDrag = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = dragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      dragStateRef.current = null;
      setDragging(false);
      if (drag.moved && positionRef.current) {
        updatePosition(positionRef.current, true);
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [updatePosition],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Home") {
        event.preventDefault();
        resetPosition();
        return;
      }

      const directions: Record<string, PopupPosition> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const direction = directions[event.key];
      if (!direction) return;

      event.preventDefault();
      const step = event.shiftKey ? 32 : 12;
      const current = positionRef.current ?? defaultPosition();
      updatePosition(
        {
          x: current.x + direction.x * step,
          y: current.y + direction.y * step,
        },
        true,
      );
    },
    [defaultPosition, resetPosition, updatePosition],
  );

  return {
    position,
    dragging,
    positionModified,
    resetPosition,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointerDrag,
      onPointerCancel: finishPointerDrag,
      onLostPointerCapture: finishPointerDrag,
      onKeyDown,
    },
  };
}
