import {
  Brain,
  House,
  NotepadTextDashed,
  Settings,
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
    id: "ai-training",
    title: "AI Training",
    href: "/ai-training",
    icon: <Brain size={22} />,
  },
  {
    id: "settings",
    title: "Setting",
    href: "/settings",
    icon: <Settings size={22} />,
  },
];
