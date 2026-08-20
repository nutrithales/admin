import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Área do Paciente | Nutri Thales Rosa",
    template: "%s | Nutri Thales Rosa",
  },
  description: "Área do Paciente Nutri Thales Rosa.",
  robots: { index: false, follow: false },
};

export default function PacienteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
