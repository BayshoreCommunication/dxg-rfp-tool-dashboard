"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type OptionProps = {
  value?: string | number;
  disabled?: boolean;
  children?: React.ReactNode;
};

type GlobalSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "multiple" | "size"
>;

const optionText = (children: React.ReactNode) =>
  React.Children.toArray(children).join("");

const GlobalSelect = ({
  children,
  value,
  defaultValue,
  onChange,
  className = "",
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: GlobalSelectProps) => {
  const generatedId = useId();
  const listboxId = `${id || generatedId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [uncontrolledValue, setUncontrolledValue] = useState(
    String(defaultValue ?? ""),
  );

  const options = useMemo(
    () =>
      React.Children.toArray(children)
        .flatMap((child) =>
          React.isValidElement<OptionProps>(child) && child.type === "option"
            ? [child]
            : [],
        )
        .map((child) => ({
          value: String(child.props.value ?? optionText(child.props.children)),
          label: optionText(child.props.children),
          disabled: Boolean(child.props.disabled),
        })),
    [children],
  );

  const controlled = value !== undefined;
  const selectedValue = String(controlled ? value ?? "" : uncontrolledValue);
  const selectedOption = options.find((option) => option.value === selectedValue);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selectedValue),
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const selectOption = (nextValue: string) => {
    if (!controlled) setUncontrolledValue(nextValue);
    onChange?.({
      target: { value: nextValue, name },
      currentTarget: { value: nextValue, name },
    } as unknown as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  const openMenu = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280 && rect.top > spaceBelow);
    }
    // Highlight the current selection at the moment the menu opens (rather
    // than in an effect, which the set-state-in-effect lint rule forbids).
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const moveActive = (direction: 1 | -1) => {
    if (!options.length) return;
    let next = activeIndex;
    do {
      next = (next + direction + options.length) % options.length;
    } while (options[next]?.disabled && next !== activeIndex);
    setActiveIndex(next);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={id}
        type="button"
        role="combobox"
        name={name}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) openMenu();
            else moveActive(event.key === "ArrowDown" ? 1 : -1);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) openMenu();
            else if (!options[activeIndex]?.disabled)
              selectOption(options[activeIndex]?.value ?? "");
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${className} flex items-center justify-between gap-3 pr-11 text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className={`min-w-0 truncate ${selectedValue ? "" : "text-slate-400"}`}>
          {selectedOption?.label || options[0]?.label || "Select an option"}
        </span>
        <span className="pointer-events-none absolute right-3 grid h-7 w-7 place-items-center rounded-lg bg-[#eafafd] text-[#1DBFD3]">
          <ChevronDown
            size={17}
            strokeWidth={2.2}
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-activedescendant={`${listboxId}-${activeIndex}`}
          className={`absolute left-0 z-[80] max-h-64 w-full min-w-56 overflow-auto rounded-xl border border-[#ccebf0] bg-white p-1.5 shadow-[0_20px_48px_rgba(15,42,67,0.16),0_4px_12px_rgba(29,191,211,0.08)] ${
            openUp ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          }`}
        >
          {options.map((option, index) => {
            const selected = option.value === selectedValue;
            const active = index === activeIndex;
            return (
              <button
                id={`${listboxId}-${index}`}
                key={`${option.value}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                  selected
                    ? "bg-[#eafafd] font-semibold text-[#109aaf]"
                    : active
                      ? "bg-slate-50 text-[#263744]"
                      : "text-[#4f606b] hover:bg-slate-50"
                }`}
              >
                <span>{option.label}</span>
                {selected && <Check size={16} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalSelect;
