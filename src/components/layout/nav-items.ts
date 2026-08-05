import {
  LayoutDashboard,
  Users,
  AppWindow,
  UtensilsCrossed,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Páginas Personalizadas", href: "/paginas-personalizadas", icon: AppWindow },
  { label: "Planos Alimentares", href: "/planos-alimentares", icon: UtensilsCrossed },
  { label: "Biblioteca", href: "/biblioteca", icon: BookOpen },
  { label: "Consultas", href: "/consultas", icon: CalendarClock },
  { label: "Check-ins", href: "/checkins", icon: ClipboardCheck },
  { label: "IA", href: "/ia", icon: Sparkles },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
