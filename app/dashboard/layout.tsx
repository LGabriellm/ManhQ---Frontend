"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Shield,
  ArrowLeft,
  Menu,
  X,
  Loader2,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/dashboard/series", label: "Séries", icon: BookOpen },
  { href: "/dashboard/uploads", label: "Uploads & Jobs", icon: Upload },
  { href: "/dashboard/security", label: "Segurança", icon: Shield },
];

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
    if (!isLoading && (!isAuthenticated || user?.role !== "ADMIN")) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <div className="flex flex-col flex-1 bg-[var(--color-surface)] border-r border-white/5">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-[var(--color-textMain)] font-semibold text-lg">
              ManhQ Admin
            </span>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
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
              href="/"
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="text-[var(--color-textMain)] font-semibold">
              ManhQ Admin
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-[var(--color-textDim)] hover:text-[var(--color-textMain)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
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
            href="/"
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
