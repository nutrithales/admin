import type { Metadata } from "next";
import { galano } from "@/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Painel Administrativo | Nutri Thales Rosa",
    template: "%s | Painel Nutri Thales Rosa",
  },
  description: "Central de gerenciamento do consultório Nutri Thales Rosa.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={galano.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
