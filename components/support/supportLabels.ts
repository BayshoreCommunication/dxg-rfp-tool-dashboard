import type { SupportTicketCategory, SupportTicketStatus } from "@/app/actions/supportDesk";

export const CATEGORY_OPTIONS: ReadonlyArray<{ value: SupportTicketCategory; label: string; hint: string }> = [
  { value: "how_to", label: "How do I…", hint: "Finding a page or finishing a step" },
  { value: "bug", label: "Something isn't working", hint: "An error, a stuck screen, a wrong result" },
  { value: "vendor_email", label: "Vendors & email", hint: "Invitations, links, replies that never arrived" },
  { value: "billing", label: "Account & sign-in", hint: "Password, access, email changes" },
  { value: "other", label: "Something else", hint: "Anything that doesn't fit above" },
];

export const categoryLabel = (category: SupportTicketCategory): string =>
  CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;

export const statusLabel = (status: SupportTicketStatus): string => {
  switch (status) {
    case "open":
      return "Open";
    case "waiting_on_customer":
      return "DXG replied";
    case "resolved":
      return "Resolved";
    case "closed":
    default:
      return "Closed";
  }
};

export const statusClass = (status: SupportTicketStatus): string => {
  switch (status) {
    case "open":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "waiting_on_customer":
      return "bg-[#008ad2]/10 text-[#0069a0] ring-[#008ad2]/20";
    case "resolved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "closed":
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
};

export const isTerminal = (status: SupportTicketStatus): boolean =>
  status === "resolved" || status === "closed";
