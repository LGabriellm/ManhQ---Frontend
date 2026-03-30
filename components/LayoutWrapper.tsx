"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import {
  isPublicAppPath,
  requiresActiveSubscription,
  SUBSCRIPTION_MANAGEMENT_ROUTE,
} from "@/lib/subscription";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessGranted, isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = isPublicAppPath(pathname);
  const needsActiveSubscription = requiresActiveSubscription(pathname);
  const shouldHideNav =
    pathname?.includes("/reader") ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/subscription") ||
    isPublicRoute;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.replace("/auth/login");
    }

    if (
      !isLoading &&
      isAuthenticated &&
      !accessGranted &&
      needsActiveSubscription
    ) {
      router.replace(SUBSCRIPTION_MANAGEMENT_ROUTE);
    }
  }, [
    accessGranted,
    isLoading,
    isAuthenticated,
    isPublicRoute,
    needsActiveSubscription,
    router,
  ]);

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

  if (isAuthenticated && !accessGranted && needsActiveSubscription) {
    return null;
  }

  return (
    <>
      <div className={shouldHideNav ? "" : "pb-20"}>{children}</div>
      {!shouldHideNav && <BottomNav />}
    </>
  );
}
