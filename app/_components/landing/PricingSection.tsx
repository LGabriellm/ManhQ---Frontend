"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import { SUBSCRIPTION_CHECKOUT_URL, getDefaultAuthenticatedPath } from "@/lib/subscription";
import { trackFacebookPixel } from "@/lib/facebookPixel";
import { FounderCountInline } from "@/components/FounderSpotlight";

const pricingBenefits = [
  "Acesso completo — HQs, mangás e manhwas sem limite",
  "Badge exclusivo de Fundador no seu perfil com número da vaga",
  "Ranking semanal, conquistas de leitura e histórico completo",
  "Interface sem anúncio, sem popup, otimizada para celular",
  "Pagamento único de R$14,99 — sem mensalidade, sem renovação",
  "Acesso vitalício garantido — pague uma vez, acesse para sempre",
];

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function PricingSection() {
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
      placement: "pricing",
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-2xl">
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.03] shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-sm"
        >
          <div className="border-b border-white/8 px-6 pb-8 pt-8 text-center sm:px-10 sm:pt-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Oferta limitada · {status.totalSlots} vagas
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
              Garanta por apenas R$14,99{" "}
              <span className="text-primary">para sempre.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55">
              Os 100 primeiros assinantes são Fundadores. Quando a ManHQ
              crescer e o preço subir —{" "}
              <strong className="text-white/80">
                você continua pagando R$14,99 para sempre
              </strong>
              . Sem asterisco. Sem condição escondida.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10">
            <div className="mb-6 text-center">
              <p className="text-4xl font-extrabold text-white sm:text-5xl">
                R$ <span className="text-6xl sm:text-7xl">14,99</span>
                <span className="ml-1 text-base font-normal text-white/50">
                  único
                </span>
              </p>
              <p className="mt-1 text-xs text-primary/70">
                Pagamento único · acesso vitalício garantido
              </p>
            </div>

            <div className="space-y-3">
              {pricingBenefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-start gap-3 text-sm text-white/65"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" />
                  </div>
                  {benefit}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <motion.a
                href={primaryCtaHref}
                target={primaryCtaTarget}
                rel={primaryCtaRel}
                onClick={handleCta}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)] sm:w-auto sm:flex-1"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </motion.a>
              <FounderCountInline
                status={status}
                isLoading={founderLoading}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
