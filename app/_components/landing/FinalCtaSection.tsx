"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { SUBSCRIPTION_CHECKOUT_URL, getDefaultAuthenticatedPath } from "@/lib/subscription";
import { trackFacebookPixel } from "@/lib/facebookPixel";

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function FinalCtaSection() {
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
      placement: "final_cta",
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <section className="px-5 pb-20 pt-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-primary/16 bg-linear-to-br from-primary/12 via-white/4 to-white/2 p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.3)] sm:p-12 lg:p-16"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />

          <p className="relative text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
            pronto para entrar na manhq?
          </p>
          <h2 className="relative mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
            {isAuthenticated
              ? `Bora continuar, ${user?.name?.split(" ")[0] || "leitor"}?`
              : "As vagas de Fundador estão acabando."}
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55 sm:text-base">
            {isAuthenticated
              ? "Sua experiência de leitura está esperando."
              : `Entre agora, garanta R$14,99 para sempre e faça parte dos primeiros ${status.totalSlots} leitores da ManHQ.`}
          </p>

          {!isAuthenticated && !founderLoading && status.isActive && (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative mt-3 text-base font-bold text-amber-400"
            >
              Restam apenas {status.remaining} vaga
              {status.remaining !== 1 ? "s" : ""}.
            </motion.p>
          )}

          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <motion.a
              href={primaryCtaHref}
              target={primaryCtaTarget}
              rel={primaryCtaRel}
              onClick={handleCta}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)]"
            >
              <Play className="h-4 w-4 fill-white" />
              {primaryCtaLabel}
            </motion.a>
            <Link
              href={isAuthenticated ? authenticatedPath : "/auth/login"}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-textMain backdrop-blur-xl"
              >
                {isAuthenticated ? "Abrir minha área" : "Já sou assinante"}
                <ChevronRight className="h-4 w-4" />
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
