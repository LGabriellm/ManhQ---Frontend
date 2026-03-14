"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { UserAvatar } from "@/components/community/UserAvatar";

const navItems = [
  { href: "/", icon: Home, label: "Início" },
  { href: "/search", icon: Search, label: "Buscar" },
  { href: "/library", icon: Library, label: "Biblioteca" },
  { href: "/profile", icon: User, label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const shouldHide =
    pathname?.includes("/reader") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/dashboard");

  if (shouldHide) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Fade gradient — suave de transparente para background */}
      <div className="pointer-events-none h-8 bg-linear-to-t from-background/95 to-transparent" />

      <nav className="relative bg-background/80 backdrop-blur-2xl border-t border-white/4">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center w-16 py-1.5 gap-1 tap-highlight-transparent"
              >
                {/* Pill glow animado */}
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-indicator"
                    className="absolute -top-2 w-10 h-1 rounded-full bg-primary shadow-[0_0_12px_rgba(229,9,20,0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                {item.href === "/profile" && user?.id ? (
                  <UserAvatar
                    userId={user.id}
                    name={user.name || undefined}
                    className={cn(
                      "relative h-5.25 w-5.25 rounded-full transition-all duration-200",
                      isActive ? "ring-primary/60" : "ring-white/20",
                    )}
                  />
                ) : (
                  <Icon
                    className={cn(
                      "relative w-5.25 h-5.25 transition-all duration-200",
                      isActive
                        ? "text-primary drop-shadow-[0_0_6px_rgba(229,9,20,0.35)]"
                        : "text-white/30",
                    )}
                    strokeWidth={isActive ? 2.2 : 1.6}
                  />
                )}
                <span
                  className={cn(
                    "relative text-[10px] leading-none font-medium transition-all duration-200",
                    isActive ? "text-primary" : "text-white/25",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
