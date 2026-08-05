"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface AdminShellProps {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  adminPhotoUrl: string | null;
}

export function AdminShell({ children, adminName, adminEmail, adminPhotoUrl }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="lg:pl-72">
        <Topbar
          onOpenMobileMenu={() => setMobileOpen(true)}
          adminName={adminName}
          adminEmail={adminEmail}
          adminPhotoUrl={adminPhotoUrl}
        />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
