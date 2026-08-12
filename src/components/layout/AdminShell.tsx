"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const UI_VERSION = "logo-v3";

export interface AdminShellProps {
  children: React.ReactNode;
  adminName: string;
  adminEmail: string;
  adminPhotoUrl: string | null;
}

export function AdminShell({ children, adminName, adminEmail, adminPhotoUrl }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const key = "nutri-admin-ui-version";
    const current = window.sessionStorage.getItem(key);
    if (current !== UI_VERSION) {
      window.sessionStorage.setItem(key, UI_VERSION);
      const url = new URL(window.location.href);
      url.searchParams.set("ui", UI_VERSION);
      window.location.replace(url.toString());
    }
  }, []);

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
