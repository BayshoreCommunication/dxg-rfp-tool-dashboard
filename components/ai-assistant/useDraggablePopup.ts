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

type PopupSize = {
  width: number;
  height: number;
};

type ResizeEdge = "topRight" | "bottomRight";

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type ResizeState = {
  pointerId: number;
  edge: ResizeEdge;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  startBottom: number;
  startWidth: number;
  startHeight: number;
  moved: boolean;
};

const VIEWPORT_MARGIN = 12;
const DEFAULT_LEFT = 102;
const DEFAULT_BOTTOM = 135;
const DEFAULT_WIDTH = 384;
const DEFAULT_HEIGHT = 460;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
const MAX_WIDTH = DEFAULT_WIDTH * 2;
const MAX_HEIGHT = DEFAULT_HEIGHT * 2;
const POSITION_STORAGE_KEY = "rfpilot:ai-assistant-position:v1";
const SIZE_STORAGE_KEY = "rfpilot:ai-assistant-size:v1";

const visibleViewport = () => {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
};

const positionsMatch = (
  first: PopupPosition | null,
  second: PopupPosition,
) => first?.x === second.x && first.y === second.y;

const sizesMatch = (
  first: PopupSize | null,
  second: PopupSize,
) => first?.width === second.width && first.height === second.height;

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

const readStoredSize = (): PopupSize | null => {
  try {
    const value = window.localStorage.getItem(SIZE_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<PopupSize>;
    if (
      !Number.isFinite(parsed.width) ||
      !Number.isFinite(parsed.height)
    ) {
      window.localStorage.removeItem(SIZE_STORAGE_KEY);
      return null;
    }
    return {
      width: parsed.width as number,
      height: parsed.height as number,
    };
  } catch {
    return null;
  }
};

const persistSize = (size: PopupSize | null) => {
  try {
    if (size) {
      window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
    } else {
      window.localStorage.removeItem(SIZE_STORAGE_KEY);
    }
  } catch {
    // Size memory is a progressive enhancement.
  }
};

export default function useDraggablePopup(
  popupRef: RefObject<HTMLElement | null>,
) {
  const positionRef = useRef<PopupPosition | null>(null);
  const sizeRef = useRef<PopupSize | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const modifiedRef = useRef(false);
  const sizeModifiedRef = useRef(false);
  const [position, setPosition] = useState<PopupPosition | null>(null);
  const [size, setSize] = useState<PopupSize | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [positionModified, setPositionModified] = useState(false);
  const [sizeModified, setSizeModified] = useState(false);
  const [interactionAnnouncement, setInteractionAnnouncement] =
    useState("");

  const popupSize = useCallback(() => {
    const rect = popupRef.current?.getBoundingClientRect();
    return sizeRef.current ?? {
      width:
        rect?.width ||
        Math.min(
          DEFAULT_WIDTH,
          Math.max(0, visibleViewport().width - VIEWPORT_MARGIN * 2),
        ),
      height:
        rect?.height ||
        Math.min(
          DEFAULT_HEIGHT,
          Math.max(0, visibleViewport().height - VIEWPORT_MARGIN * 2),
        ),
    };
  }, [popupRef]);

  const clampSize = useCallback(
    (
      candidate: PopupSize,
      maximum: PopupSize = {
        width: Math.min(
          MAX_WIDTH,
          Math.max(0, visibleViewport().width - VIEWPORT_MARGIN * 2),
        ),
        height: Math.min(
          MAX_HEIGHT,
          Math.max(0, visibleViewport().height - VIEWPORT_MARGIN * 2),
        ),
      },
    ): PopupSize => {
      const maxWidth = Math.max(0, maximum.width);
      const maxHeight = Math.max(0, maximum.height);
      const minWidth = Math.min(MIN_WIDTH, maxWidth);
      const minHeight = Math.min(MIN_HEIGHT, maxHeight);
      return {
        width: Math.round(
          Math.min(maxWidth, Math.max(minWidth, candidate.width)),
        ),
        height: Math.round(
          Math.min(maxHeight, Math.max(minHeight, candidate.height)),
        ),
      };
    },
    [],
  );

  const defaultSize = useCallback(
    (): PopupSize =>
      clampSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }),
    [clampSize],
  );

  const clamp = useCallback(
    (
      candidate: PopupPosition,
      measuredSize: PopupSize = popupSize(),
    ): PopupPosition => {
      const { width, height } = measuredSize;
      const viewport = visibleViewport();
      const maxX = Math.max(
        viewport.left + VIEWPORT_MARGIN,
        viewport.left + viewport.width - width - VIEWPORT_MARGIN,
      );
      const maxY = Math.max(
        viewport.top + VIEWPORT_MARGIN,
        viewport.top + viewport.height - height - VIEWPORT_MARGIN,
      );
      return {
        x: Math.round(
          Math.min(
            maxX,
            Math.max(viewport.left + VIEWPORT_MARGIN, candidate.x),
          ),
        ),
        y: Math.round(
          Math.min(
            maxY,
            Math.max(viewport.top + VIEWPORT_MARGIN, candidate.y),
          ),
        ),
      };
    },
    [popupSize],
  );

  const defaultPosition = useCallback(
    (measuredSize: PopupSize = popupSize()): PopupPosition => {
      const viewport = visibleViewport();
      return clamp(
        {
          x: DEFAULT_LEFT,
          y:
            viewport.top +
            viewport.height -
            measuredSize.height -
            DEFAULT_BOTTOM,
        },
        measuredSize,
      );
    },
    [clamp, popupSize],
  );

  const updatePosition = useCallback(
    (
      next: PopupPosition,
      remember = false,
      measuredSize: PopupSize = popupSize(),
    ) => {
      const safePosition = clamp(next, measuredSize);
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
    [clamp, popupSize],
  );

  const updateSize = useCallback(
    (next: PopupSize, remember = false) => {
      const safeSize = clampSize(next);
      sizeRef.current = safeSize;
      setSize((current) =>
        sizesMatch(current, safeSize) ? current : safeSize,
      );

      if (remember) {
        sizeModifiedRef.current = true;
        setSizeModified(true);
        persistSize(safeSize);
      }
      return safeSize;
    },
    [clampSize],
  );

  const resetPosition = useCallback(() => {
    modifiedRef.current = false;
    setPositionModified(false);
    persistPosition(null);
    updatePosition(defaultPosition());
    setInteractionAnnouncement("Assistant position reset.");
  }, [defaultPosition, updatePosition]);

  const resetSize = useCallback(() => {
    const nextSize = defaultSize();
    sizeModifiedRef.current = false;
    setSizeModified(false);
    persistSize(null);
    updateSize(nextSize);

    const nextPosition = modifiedRef.current
      ? clamp(positionRef.current ?? defaultPosition(nextSize), nextSize)
      : defaultPosition(nextSize);
    updatePosition(nextPosition, modifiedRef.current, nextSize);
    setInteractionAnnouncement("Assistant size reset.");
  }, [
    clamp,
    defaultPosition,
    defaultSize,
    updatePosition,
    updateSize,
  ]);

  useLayoutEffect(() => {
    const initializeFrame = window.requestAnimationFrame(() => {
      const storedSize = readStoredSize();
      const initialSize = clampSize(storedSize ?? defaultSize());
      sizeRef.current = initialSize;
      setSize(initialSize);
      sizeModifiedRef.current = Boolean(storedSize);
      setSizeModified(Boolean(storedSize));

      const storedPosition = readStoredPosition();
      modifiedRef.current = Boolean(storedPosition);
      setPositionModified(Boolean(storedPosition));
      updatePosition(
        storedPosition ?? defaultPosition(initialSize),
        false,
        initialSize,
      );
    });

    const handleResize = () => {
      const safeSize = clampSize(sizeRef.current ?? defaultSize());
      updateSize(safeSize, sizeModifiedRef.current);
      const next = modifiedRef.current
        ? clamp(
            positionRef.current ?? defaultPosition(safeSize),
            safeSize,
          )
        : defaultPosition(safeSize);
      updatePosition(next, modifiedRef.current, safeSize);
    };
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    return () => {
      window.cancelAnimationFrame(initializeFrame);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, [
    clamp,
    clampSize,
    defaultPosition,
    defaultSize,
    updatePosition,
    updateSize,
  ]);

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
        setInteractionAnnouncement(
          `Assistant moved to ${positionRef.current.x} pixels from the left and ${positionRef.current.y} pixels from the top.`,
        );
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
      const nextPosition = updatePosition(
        {
          x: current.x + direction.x * step,
          y: current.y + direction.y * step,
        },
        true,
      );
      setInteractionAnnouncement(
        `Assistant position ${nextPosition.x} pixels from the left, ${nextPosition.y} pixels from the top.`,
      );
    },
    [defaultPosition, resetPosition, updatePosition],
  );

  const applyResize = useCallback(
    (
      edge: ResizeEdge,
      candidate: PopupSize,
      frame: Pick<
        ResizeState,
        "startLeft" | "startTop" | "startBottom"
      >,
      remember = false,
    ) => {
      const viewport = visibleViewport();
      const safeSize = clampSize(candidate, {
        width: Math.min(
          MAX_WIDTH,
          viewport.left +
            viewport.width -
            frame.startLeft -
            VIEWPORT_MARGIN,
        ),
        height: Math.min(
          MAX_HEIGHT,
          edge === "topRight"
            ? frame.startBottom -
              viewport.top -
              VIEWPORT_MARGIN
            : viewport.top +
                viewport.height -
                frame.startTop -
                VIEWPORT_MARGIN,
        ),
      });
      updateSize(safeSize, remember);

      if (edge === "topRight") {
        updatePosition(
          {
            x: frame.startLeft,
            y: frame.startBottom - safeSize.height,
          },
          remember,
          safeSize,
        );
      }
      return safeSize;
    },
    [clampSize, updatePosition, updateSize],
  );

  const onResizePointerDown = useCallback(
    (
      edge: ResizeEdge,
      event: ReactPointerEvent<HTMLButtonElement>,
    ) => {
      if (event.button !== 0) return;
      const rect = popupRef.current?.getBoundingClientRect();
      if (!rect) return;

      resizeStateRef.current = {
        pointerId: event.pointerId,
        edge,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: rect.left,
        startTop: rect.top,
        startBottom: rect.bottom,
        startWidth: rect.width,
        startHeight: rect.height,
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setResizing(true);
      event.preventDefault();
    },
    [popupRef],
  );

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resize = resizeStateRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - resize.startX;
      const deltaY = event.clientY - resize.startY;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        resize.moved = true;
      }
      applyResize(
        resize.edge,
        {
          width: resize.startWidth + deltaX,
          height:
            resize.startHeight +
            (resize.edge === "topRight" ? -deltaY : deltaY),
        },
        resize,
      );
      event.preventDefault();
    },
    [applyResize],
  );

  const finishPointerResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const resize = resizeStateRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;

      resizeStateRef.current = null;
      setResizing(false);
      if (resize.moved && sizeRef.current) {
        updateSize(sizeRef.current, true);
        if (resize.edge === "topRight" && positionRef.current) {
          updatePosition(positionRef.current, true, sizeRef.current);
        }
        setInteractionAnnouncement(
          `Assistant resized to ${sizeRef.current.width} by ${sizeRef.current.height} pixels.`,
        );
      }
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [updatePosition, updateSize],
  );

  const onResizeKeyDown = useCallback(
    (
      edge: ResizeEdge,
      event: React.KeyboardEvent<HTMLButtonElement>,
    ) => {
      if (event.key === "Home") {
        event.preventDefault();
        resetSize();
        return;
      }
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
          event.key,
        )
      ) {
        return;
      }

      const currentSize = popupSize();
      const currentPosition =
        positionRef.current ?? defaultPosition(currentSize);
      event.preventDefault();
      const step = event.shiftKey ? 32 : 16;
      const next = {
        width:
          currentSize.width +
          (event.key === "ArrowRight"
            ? step
            : event.key === "ArrowLeft"
              ? -step
              : 0),
        height:
          currentSize.height +
          (event.key === "ArrowDown"
            ? edge === "topRight"
              ? -step
              : step
            : event.key === "ArrowUp"
              ? edge === "topRight"
                ? step
                : -step
              : 0),
      };
      const resized = applyResize(
        edge,
        next,
        {
          startLeft: currentPosition.x,
          startTop: currentPosition.y,
          startBottom: currentPosition.y + currentSize.height,
        },
        true,
      );
      setInteractionAnnouncement(
        `Assistant size ${resized.width} by ${resized.height} pixels.`,
      );
    },
    [applyResize, defaultPosition, popupSize, resetSize],
  );

  const resizeHandleProps = useCallback(
    (edge: ResizeEdge) => ({
      onPointerDown: (
        event: ReactPointerEvent<HTMLButtonElement>,
      ) => onResizePointerDown(edge, event),
      onPointerMove: onResizePointerMove,
      onPointerUp: finishPointerResize,
      onPointerCancel: finishPointerResize,
      onLostPointerCapture: finishPointerResize,
      onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) =>
        onResizeKeyDown(edge, event),
    }),
    [
      finishPointerResize,
      onResizeKeyDown,
      onResizePointerDown,
      onResizePointerMove,
    ],
  );

  return {
    position,
    size,
    dragging,
    resizing,
    positionModified,
    sizeModified,
    interactionAnnouncement,
    resetPosition,
    resetSize,
    resizeHandleProps,
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
