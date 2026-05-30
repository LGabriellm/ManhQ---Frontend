"use client";

import { motion } from "framer-motion";
import { Crown, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { SUBSCRIPTION_CHECKOUT_URL, getDefaultAuthenticatedPath } from "@/lib/subscription";
import { trackFacebookPixel } from "@/lib/facebookPixel";
import { FounderBadgePreview } from "@/components/FounderSpotlight";

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function FounderBadgeSection() {
  const { isAuthenticated, user } = useAuth();
  const { data: founderStatus, isLoading: founderLoading } = useFounderStatus();

  if (isAuthenticated) return null;

  const authenticatedPath = getDefaultAuthenticatedPath(user);
  const primaryCtaHref = isAuthenticated ? authenticatedPath : SUBSCRIPTION_CHECKOUT_URL;
  const primaryCtaTarget = isAuthenticated ? undefined : "_blank";
  const primaryCtaRel = isAuthenticated ? undefined : "noreferrer";
  const primaryCtaLabel = isAuthenticated ? "Abrir minha área" : "Garantir minha vaga de Fundador";

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
      placement: "badge_section",
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/6 via-black/40 to-black/20 p-8 sm:p-12"
        >
          {/* Background glow */}
          <div className="pointer-events-none absolute -top-20 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-amber-500/10 blur-[80px]" />

          <div className="relative grid gap-8 sm:grid-cols-2 sm:items-center">
            {/* Left: copy */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                <Crown className="h-3 w-3" />
                Badge exclusivo e permanente
              </div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Seu número de Fundador,
                <br />
                <span className="text-amber-400">para sempre.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                Os primeiros 100 assinantes recebem um badge único com seu
                número de vaga — exibido no perfil, comentários e no
                ranking. Não tem como comprar depois. Não tem como
                transferir.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Aparece ao lado do seu nome em toda a comunidade",
                  "Número permanente — nunca muda",
                  "Disponível apenas para os primeiros 100 assinantes",
                  "Quando as vagas fecharem, não há mais como obter",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-xs text-white/55"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: visual badge showcase */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
                Prévia do seu badge
              </p>
              {/* Animated badge stack */}
              <div className="flex flex-col items-center gap-2">
                {[
                  status.nextNumber,
                  status.nextNumber + 1,
                  status.nextNumber + 2,
                ].map((num, i) => (
                  <motion.div
                    key={num}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{
                      opacity: 1 - i * 0.25,
                      scale: 1 - i * 0.05,
                    }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    style={{ zIndex: 3 - i }}
                    className="relative"
                  >
                    <FounderBadgePreview
                      number={num}
                      size={i === 0 ? "lg" : "md"}
                    />
                  </motion.div>
                ))}
              </div>
              <p className="text-center text-[11px] text-white/35 max-w-[180px] leading-relaxed">
                Sua vaga disponível agora:{" "}
                <span className="font-bold text-amber-400">
                  Fundador #{String(status.nextNumber).padStart(3, "0")}
                </span>
              </p>
              <motion.a
                href={primaryCtaHref}
                target={primaryCtaTarget}
                rel={primaryCtaRel}
                onClick={handleCta}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-5 py-2.5 text-sm font-bold text-amber-400 hover:bg-amber-500/25 transition-colors"
              >
                <Crown className="h-4 w-4" />
                Quero este badge
              </motion.a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
