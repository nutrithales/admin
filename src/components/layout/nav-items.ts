import {
  LayoutDashboard, Users, AppWindow, UtensilsCrossed, Apple, ChefHat, Salad, ListChecks, BookOpen, CalendarClock, ClipboardCheck, Sparkles, Settings, Bot, Workflow, ContactRound, FileText, ReceiptText, type LucideIcon,
} from "lucide-react";
export interface NavItem { label: string; href: string; icon: LucideIcon; }
export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Maria", href: "/clara", icon: Bot },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Leads", href: "/leads", icon: ContactRound },
  { label: "Fluxo", href: "/fluxo", icon: Workflow },
  { label: "Pagamentos", href: "/pagamentos", icon: ReceiptText },
  { label: "Páginas Personalizadas", href: "/paginas-personalizadas", icon: AppWindow },
  { label: "Planos Alimentares", href: "/planos-alimentares", icon: UtensilsCrossed },
  { label: "Alimentos", href: "/alimentos", icon: Apple },
  { label: "Receitas", href: "/receitas", icon: ChefHat },
  { label: "Refeições", href: "/refeicoes", icon: Salad },
  { label: "Protocolos", href: "/protocolos", icon: ListChecks },
  { label: "Biblioteca", href: "/biblioteca", icon: BookOpen },
  { label: "Agenda", href: "/agenda", icon: CalendarClock },
  { label: "Consultas", href: "/consultas", icon: CalendarClock },
  { label: "Formulários", href: "/formularios", icon: FileText },
  { label: "Check-ins", href: "/checkins", icon: ClipboardCheck },
  { label: "IA", href: "/ia", icon: Sparkles },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];