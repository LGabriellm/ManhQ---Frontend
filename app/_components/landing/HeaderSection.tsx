"use client";

import { Logo } from "@/components/Logo";
import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { SUBSCRIPTION_CHECKOUT_URL, getDefaultAuthenticatedPath } from "@/lib/subscription";
import { trackFacebookPixel } from "@/lib/facebookPixel";

export function HeaderSection() {
  const { isAuthenticated, user } = useAuth();
  const { data: founderStatus, isLoading: founderLoading } = useFounderStatus();

  const authenticatedPath = getDefaultAuthenticatedPath(user);
  const primaryCtaHref = isAuthenticated ? authenticatedPath : SUBSCRIPTION_CHECKOUT_URL;
  const primaryCtaLabel = isAuthenticated ? "Abrir minha área" : "Garantir minha vaga de Fundador";
  const primaryCtaTarget = isAuthenticated ? undefined : "_blank";
  const primaryCtaRel = isAuthenticated ? undefined : "noreferrer";

  const status = founderStatus ?? {
    totalSlots: 100,
    claimed: 95,
    remaining: 5,
    nextNumber: 96,
    isActive: true,
  };

  const handleCta = () => {
    if (isAuthenticated) return;
    trackFacebookPixel("InitiateCheckout", {
      content_name: "Landing Page CTA",
      content_category: "subscription",
      source: "landing_page",
      placement: "header",
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <header className="px-5 py-5 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Logo size="md" href="/home" />
        <a
          href={primaryCtaHref}
          target={primaryCtaTarget}
          rel={primaryCtaRel}
          onClick={handleCta}
          className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/8 px-4 py-2 text-xs font-semibold text-amber-400 transition-all hover:bg-amber-500/15 sm:text-sm"
        >
          <Crown className="h-3.5 w-3.5" />
          {isAuthenticated
            ? "Abrir minha área"
            : founderLoading
              ? "Vagas abertas"
              : `${status.remaining} vagas · R$14,99`}
        </a>
      </div>
    </header>
  );
}
