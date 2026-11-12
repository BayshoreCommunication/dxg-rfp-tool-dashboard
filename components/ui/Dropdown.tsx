"use client";

// A menu of actions behind a "more" button. Sourced from Untitled UI React (CLI:
// `untitledui add dropdown`, file base/dropdown/dropdown.tsx) and restyled to this app's
// tokens: the Untitled UI theme classes mean other colours here, so the classes below are this
// app's slate / sky palette, which the dark theme in app/globals.css already remaps. Left out:
// the avatar, checkbox, radio and toggle item variants (and the four base components they pull
// in), submenus, the Untitled UI icons and the animation plugin. Behaviour (arrow keys,
// type-ahead, Escape, focus return, aria) is react-aria-components.

import { MoreVertical, type LucideIcon } from "lucide-react";
import type { RefAttributes } from "react";
import type {
  ButtonProps as AriaButtonProps,
  MenuItemProps as AriaMenuItemProps,
  MenuProps as AriaMenuProps,
  PopoverProps as AriaPopoverProps,
  SeparatorProps as AriaSeparatorProps,
} from "react-aria-components";
import {
  Button as AriaButton,
  Menu as AriaMenu,
  MenuItem as AriaMenuItem,
  MenuTrigger as AriaMenuTrigger,
  Popover as AriaPopover,
  Separator as AriaSeparator,
} from "react-aria-components";

type DropdownItemProps = Omit<AriaMenuItemProps, "children" | "className"> & {
  label: string;
  icon?: LucideIcon;
  // Shown smaller under the label, for example why an item is switched off.
  hint?: string;
  // For an action that removes or hides something.
  tone?: "default" | "danger";
};

const DropdownItem = ({ label, icon: Icon, hint, tone = "default", ...props }: DropdownItemProps) => (
  <AriaMenuItem
    textValue={label}
    {...props}
    className={({ isDisabled }) => `group block px-1.5 py-px outline-none ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
  >
    {({ isFocused, isFocusVisible }) => (
      <span
        className={[
          "flex items-start gap-2 rounded-md px-2.5 py-2",
          isFocused ? "bg-slate-100" : "",
          isFocusVisible ? "ring-2 ring-inset ring-sky-500" : "",
        ].join(" ")}
      >
        {Icon && <Icon size={15} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone === "danger" ? "text-red-700" : "text-slate-500"}`} />}
        <span className="min-w-0">
          <span className={`block text-sm font-semibold ${tone === "danger" ? "text-red-700" : "text-slate-700"}`}>{label}</span>
          {hint && <span className="block text-xs text-slate-500">{hint}</span>}
        </span>
      </span>
    )}
  </AriaMenuItem>
);

const DropdownMenu = <T extends object>(props: AriaMenuProps<T>) => (
  <AriaMenu {...props} className="max-h-[inherit] select-none overflow-y-auto py-1 outline-none" />
);

const DropdownPopover = (props: AriaPopoverProps) => (
  <AriaPopover
    placement="bottom end"
    offset={4}
    {...props}
    className="z-50 w-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg outline-none"
  />
);

const DropdownSeparator = (props: AriaSeparatorProps) => <AriaSeparator {...props} className="my-1 h-px w-full bg-slate-200" />;

const dotsButtonClass =
  "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-900 data-[focus-visible]:ring-2 data-[focus-visible]:ring-sky-500 data-[focus-visible]:ring-offset-2 data-[pressed]:bg-slate-100";

// The trigger. `aria-label` says what the menu is for, for example "Actions for Spring Gala".
const DropdownDotsButton = (props: AriaButtonProps & RefAttributes<HTMLButtonElement> & { "aria-label": string }) => (
  <AriaButton {...props} className={dotsButtonClass}>
    <MoreVertical size={18} aria-hidden="true" />
  </AriaButton>
);

// The trigger as the server draws it, before the menu exists in the browser. react-aria gives
// its elements generated ids, and inside a streamed server-rendered list those ids don't match
// between the server's HTML and the browser's first render. So a list renders this plain button
// first and swaps in the real menu once it has mounted; the two look the same.
const DropdownDotsPlaceholder = ({ "aria-label": label }: { "aria-label": string }) => (
  <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={false} className={dotsButtonClass}>
    <MoreVertical size={18} aria-hidden="true" />
  </button>
);

export const Dropdown = {
  Root: AriaMenuTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Item: DropdownItem,
  Separator: DropdownSeparator,
  DotsButton: DropdownDotsButton,
  DotsPlaceholder: DropdownDotsPlaceholder,
};
