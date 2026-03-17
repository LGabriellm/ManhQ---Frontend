"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/activate",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/termos-de-servico",
  "/politica-de-privacidade",
];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute =
    pathname === "/" || PUBLIC_ROUTES.some((r) => pathname?.startsWith(r));
  const shouldHideNav =
    pathname?.includes("/reader") ||
    pathname?.startsWith("/dashboard") ||
    isPublicRoute;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return (
    <>
      <div className={shouldHideNav ? "" : "pb-20"}>{children}</div>
      {!shouldHideNav && <BottomNav />}
    </>
  );
}
