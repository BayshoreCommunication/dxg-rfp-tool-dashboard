import { useEffect, RefObject } from "react";

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

