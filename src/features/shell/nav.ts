import {
  LayoutDashboard,
  Table2,
  History,
  Tags,
  CopyPlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar. The rest are reachable from Settings. */
  mobile: boolean;
}

export const NAV: NavItem[] = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, mobile: true },
  { to: "/expenses", label: "Expenses", icon: Table2, mobile: true },
  { to: "/history", label: "History", icon: History, mobile: true },
  { to: "/categories", label: "Categories", icon: Tags, mobile: true },
  { to: "/templates", label: "Templates", icon: CopyPlus, mobile: false },
  { to: "/settings", label: "Settings", icon: Settings, mobile: true },
];
