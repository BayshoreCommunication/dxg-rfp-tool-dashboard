import { Info } from "lucide-react";
import { useEffect, useState, useRef, RefObject } from "react";
import { createPortal } from "react-dom";

export const PillRadio = ({
  name,
  value,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-5 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#35bdf2] bg-white text-[#1f2d5d]"
        : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#35bdf2]/60"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "border-[#35bdf2]" : "border-[#d7dce3]"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#35bdf2]" />}
    </span>
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    {value}
  </label>
);

export const PillCheckbox = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <label
    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 cursor-pointer text-sm font-semibold transition-all select-none ${
      checked
        ? "border-[#35bdf2] bg-white text-[#1f2d5d]"
        : "border-[#d7dce3] bg-white text-[#8f98bf] hover:border-[#35bdf2]/60"
    }`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? "border-[#35bdf2]" : "border-[#d7dce3]"
      }`}
    >
      {checked && <span className="w-2 h-2 rounded-full bg-[#35bdf2]" />}
    </span>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    {label}
  </label>
);

export const toggleItem = (arr: string[], item: string): string[] =>
  arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

export const toggleArrayItem = toggleItem;

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export const InfoTooltip = ({ text }: { text: string }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  const show = () => {
    if (!iconRef.current) return;
    const r = iconRef.current.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
  };

  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", marginLeft: "6px", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
    >
      <Info
        ref={iconRef}
        size={13}
        style={{ cursor: "help", flexShrink: 0, color: pos ? "#35bdf2" : "#b0b9d1", transition: "color 0.15s" }}
      />
      {pos && createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
            width: "220px",
            backgroundColor: "#1f2d5d",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: 1.6,
            letterSpacing: "normal",
            textTransform: "none",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            pointerEvents: "none",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #1f2d5d",
            }}
          />
        </div>,
        document.body
      )}
    </span>
  );
};

