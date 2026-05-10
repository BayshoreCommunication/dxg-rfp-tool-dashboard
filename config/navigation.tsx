import { House, Mail, NotepadTextDashed, Settings, Inbox } from "lucide-react";

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
  // {
  //   id: "vendor-responses",
  //   title: "Responses",
  //   href: "/vendor-responses",
  //   icon: <Inbox size={22} />,
  // },
  {
    id: "settings",
    title: "Setting",
    href: "/settings",
    icon: <Settings size={22} />,
  },
];
