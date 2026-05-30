"use client";

import { motion } from "framer-motion";
import { ArrowRight, Crown, Shield, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { SUBSCRIPTION_CHECKOUT_URL, getDefaultAuthenticatedPath } from "@/lib/subscription";
import { trackFacebookPixel } from "@/lib/facebookPixel";
import { FounderSpotlight } from "@/components/FounderSpotlight";

export function HeroSection() {
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
      placement: "hero",
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <section className="px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28">
      <div className="mx-auto max-w-4xl text-center">
        {/* Category pill */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(229,9,20,0.7)]" />
            Plano Fundador — apenas 100 vagas no mundo
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mx-auto max-w-3xl font-display text-[2.6rem] font-extrabold leading-[0.92] tracking-[-0.04em] text-white sm:text-[4.2rem] lg:text-[5.4rem]"
        >
          HQs, Mangás e Manhwas.{" "}
          <span className="text-primary">Experiência Netflix.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base sm:leading-7"
        >
          A plataforma com{" "}
          <strong className="text-white/80">ranking entre leitores</strong>,
          conquistas e interface limpa — sem anúncio, sem popup. Seja um dos{" "}
          {status.totalSlots} Fundadores e garanta o preço de{" "}
          <strong className="text-white/80">R$14,99 para sempre</strong>.
        </motion.p>

        {/* ── Founder Spotlight (live counter) ───────────────────── */}
        <FounderSpotlight status={status} isLoading={founderLoading} />

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <motion.a
            href={primaryCtaHref}
            target={primaryCtaTarget}
            rel={primaryCtaRel}
            onClick={handleCta}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(229,9,20,0.5)] sm:text-base"
          >
            {primaryCtaLabel}
            <ArrowRight className="h-4 w-4" />
          </motion.a>
          <p className="text-xs text-white/35">
            R$14,99 · pagamento único · acesso vitalício garantido
          </p>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {[
            { icon: Shield, text: "Pagamento 100% seguro" },
            { icon: Lock, text: "Acesso vitalício garantido" },
            { icon: Crown, text: "Badge permanente e exclusivo" },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-1.5 text-[11px] text-white/35"
            >
              <Icon className="h-3.5 w-3.5" />
              {text}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
