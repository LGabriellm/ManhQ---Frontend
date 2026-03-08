"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldHideNav =
    pathname?.includes("/reader") || pathname?.startsWith("/dashboard");

  return (
    <>
      <div className={shouldHideNav ? "" : "pb-16"}>{children}</div>
      {!shouldHideNav && <BottomNav />}
    </>
  );
}
