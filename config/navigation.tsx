import {
  CircleHelp,
  House,
  Mail,
  MessageSquareText,
  NotepadTextDashed,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export const navigationConfig: NavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: <House size={22} />,
  },
  {
    id: "proposals",
    title: "Proposals",
    href: "/proposals",
    icon: <NotepadTextDashed size={22} />,
  },
  {
    id: "email",
    title: "Email",
    href: "/email",
    icon: <Mail size={22} />,
  },
  {
    id: "vendor-responses",
    title: "Vendor Responses",
    href: "/vendor-responses",
    icon: <MessageSquareText size={22} />,
  },
  // Always-on help. The AI Assistant is gated by an organization allowlist,
  // so until now a production user had no help entry at all.
  {
    id: "help",
    title: "Help",
    href: "/help",
    icon: <CircleHelp size={22} />,
  },
];
