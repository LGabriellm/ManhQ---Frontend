"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Library,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { InfiniteCarousel } from "@/components/InfiniteCarousel";
import { trackFacebookPixel } from "@/lib/facebookPixel";

const CHECKOUT_URL =
  "https://pay.kirvano.com/fa717258-dae4-4eea-9368-970ee9cee695";

const benefits = [
  {
    icon: Library,
    title: "Tudo em um só lugar",
    description:
      "Mangás, HQs e conteúdo geek organizados para você encontrar mais rápido o que quer ler.",
  },
  {
    icon: Zap,
    title: "Continue de onde parou",
    description:
      "Retome sua leitura sem perder tempo procurando capítulos ou obras.",
  },
  {
    icon: Smartphone,
    title: "Experiência feita para maratonar",
    description:
      "Interface rápida, visual limpa e leitura confortável no celular e no computador.",
  },
  {
    icon: Sparkles,
    title: "Descubra novas obras com facilidade",
    description:
      "Explore títulos e encontre sua próxima obsessão geek em menos tempo.",
  },
];

const trustPoints = [
  "Navegação fluida para descobrir e acompanhar obras",
  "Leitura prática em celular e desktop",
  "Catálogo em expansão com experiência consistente",
  "Fluxo simples para entrar e começar a ler rápido",
];

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-white/8 bg-white/4 shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  const handleStartNowClick = (placement: string) => {
    trackFacebookPixel("InitiateCheckout", {
      content_name: "Landing Page CTA",
      content_category: "subscription",
      source: "landing_page",
      placement,
      cta_label: "Começar agora",
      destination: CHECKOUT_URL,
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-textMain">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-128 w-lg -translate-x-1/2 rounded-full bg-primary/18 blur-[140px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -left-32 top-128 h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-36 z-0 opacity-40 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_78%,transparent_100%)]">
        <InfiniteCarousel
          sort="popular"
          limit={28}
          speed={34}
          backgroundMode
          className="bg-transparent"
        />
      </div>

      <div className="relative z-10">
        <section className="relative px-5 pb-14 pt-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex items-center justify-between">
              <p className="font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                ManHQ
              </p>
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleStartNowClick("header")}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(229,9,20,0.34)] transition-transform hover:scale-[1.02]"
              >
                Começar agora
              </a>
            </div>

            <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_14px_rgba(229,9,20,0.7)]" />
                  plataforma para fãs de mangá e hq
                </div>

                <h1 className="max-w-4xl font-display text-[2.8rem] font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-[4.4rem] lg:text-[5.3rem]">
                  Leia mangás e HQs em um só lugar.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                  Descubra novas obras, continue de onde parou e tenha uma
                  experiência de leitura rápida, elegante e feita para fãs de
                  verdade.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={CHECKOUT_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleStartNowClick("hero")}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(229,9,20,0.5)]"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Começar agora
                    </motion.div>
                  </a>

                  <Link href={isAuthenticated ? "/search" : "/auth/login"}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-6 py-4 text-sm font-semibold text-textMain backdrop-blur-xl transition-all duration-300 hover:border-primary/30 hover:bg-white/8"
                    >
                      Explorar catálogo
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </Link>
                </div>

                <p className="mt-4 text-sm text-white/55">
                  Leitura prática, catálogo em expansão e experiência pensada
                  para maratonar.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 }}
              >
                <GlassCard className="p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                    por que entrar na manhq?
                  </p>
                  <div className="mt-4 space-y-3">
                    {benefits.slice(0, 3).map((item) => (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                          <item.icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-white/58">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="relative px-5 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                por que entrar na manhq?
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
                Benefícios claros para quem quer ler mais e melhor.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {benefits.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                >
                  <GlassCard className="group h-full p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_60px_rgba(229,9,20,0.2)]">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-white/58">
                      {item.description}
                    </p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <GlassCard className="overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                    seu próximo universo geek começa aqui
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
                    Se você curte mangás, HQs e boas histórias, a ManHQ foi
                    feita para você.
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                    Entre agora e conheça uma plataforma criada para facilitar
                    sua experiência, organizar sua leitura e aproximar você de
                    novas obras.
                  </p>
                </div>

                <div className="rounded-[28px] border border-white/8 bg-black/30 p-6">
                  <p className="text-sm font-semibold text-white">
                    Assinatura premium
                  </p>
                  <p className="mt-1 text-xs text-white/52">
                    Acesso imediato para começar a explorar e ler sem atrito
                  </p>

                  <div className="mt-5 space-y-3">
                    {[
                      "Acesso ao ecossistema completo da ManHQ",
                      "Leitura contínua e organizada",
                      "Descoberta e favoritos no mesmo fluxo",
                      "Interface rápida e elegante para maratonar",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 text-sm text-white/72"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/12 text-primary">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={CHECKOUT_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleStartNowClick("pricing")}
                      className="flex-1"
                    >
                      <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.33)]">
                        Começar agora
                      </div>
                    </a>
                    <Link
                      href={isAuthenticated ? "/profile" : "/auth/login"}
                      className="flex-1"
                    >
                      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-5 py-3.5 text-sm font-semibold text-textMain">
                        {isAuthenticated
                          ? "Ir para meu perfil"
                          : "Já tenho acesso"}
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        <section className="px-5 py-6 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                feita para quem realmente consome conteúdo geek
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
                Experiência criada para leitores que valorizam praticidade.
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {trustPoints.map((point, index) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                >
                  <GlassCard className="flex items-start gap-3 p-5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Check className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-7 text-white/70">{point}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-18 pt-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <GlassCard className="relative overflow-hidden border-primary/16 bg-linear-to-br from-primary/16 via-white/5 to-white/2 p-8 text-center sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
              <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                pronto para entrar na manhq?
              </p>
              <h2 className="relative mt-4 font-display text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
                {isAuthenticated
                  ? `Bora continuar, ${user?.name?.split(" ")[0] || "leitor"}?`
                  : "Explore mangás, HQs e conteúdo geek em uma plataforma feita para fãs de verdade."}
              </h2>
              <p className="relative mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/64 sm:text-base">
                Entre agora e comece com uma experiência elegante, rápida e
                pronta para quem quer ler sem fricção.
              </p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleStartNowClick("final_cta")}
                >
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)]"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Começar agora
                  </motion.div>
                </a>
                <Link href={isAuthenticated ? "/search" : "/auth/login"}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-textMain backdrop-blur-xl"
                  >
                    {isAuthenticated ? "Explorar catálogo" : "Já sou assinante"}
                    <ChevronRight className="h-4 w-4" />
                  </motion.div>
                </Link>
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </main>
  );
}
