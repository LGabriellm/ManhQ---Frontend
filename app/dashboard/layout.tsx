"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Shield,
  Users,
  ClipboardCheck,
  CreditCard,
  ArrowLeft,
  Menu,
  X,
  Loader2,
  History,
  Workflow,
  Globe,
} from "lucide-react";

type DashboardRole = "ADMIN" | "EDITOR";

const navItems: Array<{
  href: string;
  label: string;
  icon: React.ElementType;
  roles: DashboardRole[];
}> = [
  {
    href: "/dashboard",
    label: "Visão Geral",
    icon: LayoutDashboard,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/series",
    label: "Séries",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/uploads",
    label: "Uploads & Importações",
    icon: Upload,
    roles: ["ADMIN", "EDITOR"],
  },
  {
    href: "/dashboard/submissions",
    label: "Minhas Submissões",
    icon: History,
    roles: ["ADMIN", "EDITOR"],
  },
  {
    href: "/dashboard/jobs",
    label: "Jobs",
    icon: Workflow,
    roles: ["ADMIN", "EDITOR"],
  },
  {
    href: "/dashboard/providers",
    label: "Provedores",
    icon: Globe,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/users",
    label: "Usuários",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/approvals",
    label: "Aprovações",
    icon: ClipboardCheck,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/subscriptions",
    label: "Assinaturas",
    icon: CreditCard,
    roles: ["ADMIN"],
  },
  {
    href: "/dashboard/security",
    label: "Segurança",
    icon: Shield,
    roles: ["ADMIN"],
  },
];

function canAccessDashboardPath(
  pathname: string,
  role: string | undefined,
): boolean {
  if (!role) {
    return false;
  }

  if (
    pathname === "/dashboard/uploads" ||
    pathname.startsWith("/dashboard/uploads/") ||
    pathname === "/dashboard/jobs" ||
    pathname.startsWith("/dashboard/jobs/") ||
    pathname === "/dashboard/submissions" ||
    pathname.startsWith("/dashboard/submissions/")
  ) {
    return role === "ADMIN" || role === "EDITOR";
  }

  return role === "ADMIN";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (!isLoading && isAuthenticated && !canAccessDashboardPath(pathname, user?.role)) {
      if (user?.role === "EDITOR") {
        router.replace("/dashboard/uploads");
        return;
      }

      router.replace("/home");
    }
  }, [isLoading, isAuthenticated, pathname, router, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated || !canAccessDashboardPath(pathname, user?.role)) {
    return null;
  }

  const currentRole = user?.role === "ADMIN" ? "ADMIN" : "EDITOR";
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(currentRole),
  );

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <div className="flex flex-col flex-1 bg-[var(--color-surface)] border-r border-white/5">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-white/5">
            <Logo size="sm" href="/dashboard" />
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)]"
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Back to App */}
          <div className="px-3 py-4 border-t border-white/5">
            <Link
              href="/home"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao App
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-surface)] border-r border-white/5 transform transition-transform lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-white/5">
          <Logo size="sm" href="/dashboard" />
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu lateral"
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)]"
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-white/5">
          <Link
            href="/home"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-textDim)] hover:bg-white/5 hover:text-[var(--color-textMain)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Voltar ao App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-white/5 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu lateral"
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)] mr-4"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-[var(--color-textMain)] font-semibold">
            ManhQ Admin
          </span>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
