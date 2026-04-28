"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Lock,
  Play,
  Shield,
  Smartphone,
  Star,
  Trophy,
  Tv,
  Zap,
} from "lucide-react";
import {
  SUBSCRIPTION_CHECKOUT_URL,
  getDefaultAuthenticatedPath,
} from "@/lib/subscription";
import { useAuth } from "@/contexts/AuthContext";
import { trackFacebookPixel } from "@/lib/facebookPixel";
import { Logo } from "@/components/Logo";
import { useFounderStatus } from "@/hooks/useFounderStatus";
import {
  FounderSpotlight,
  FounderCountInline,
  FounderBadgePreview,
} from "@/components/FounderSpotlight";

const LandingCarousel = dynamic(
  () =>
    import("@/components/InfiniteCarousel").then((mod) => mod.InfiniteCarousel),
  { ssr: false },
);

/* ─── Static data ──────────────────────────────────────────────────────────── */

const features = [
  {
    icon: Tv,
    title: "Interface estilo Netflix",
    description:
      "Navegação fluida, sem anúncio no meio do capítulo, sem popup de cadastro. Você abre e lê. Simples assim.",
  },
  {
    icon: Trophy,
    title: "Ranking entre leitores",
    description:
      "Seu histórico de leitura vira pontuação. Todo domingo o ranking atualiza — você compete com leitores de todo o Brasil.",
  },
  {
    icon: Star,
    title: "Conquistas de leitura",
    description:
      "Terminou uma saga? Maratonou um arco? A ManHQ reconhece. Badges exclusivos no seu perfil que mostram sua jornada.",
  },
  {
    icon: Zap,
    title: "HQs, Mangás e Manhwas",
    description:
      "Marvel, DC, Naruto, One Piece, Solo Levelling e muito mais. Os três formatos em uma plataforma. Um preço.",
  },
  {
    icon: Smartphone,
    title: "Otimizada para celular",
    description:
      "Leitura vertical nativa para manhwas, zoom suave em HQs e mangás. A experiência que o celular merecia.",
  },
  {
    icon: Lock,
    title: "Cancele quando quiser",
    description:
      "Sem fidelidade, sem multa, sem burocracia. Seu dinheiro, sua decisão. Se não curtir, é só cancelar.",
  },
];

const pricingBenefits = [
  "Acesso completo — HQs, mangás e manhwas sem limite",
  "Badge exclusivo de Fundador no seu perfil com número da vaga",
  "Ranking semanal, conquistas de leitura e histórico completo",
  "Interface sem anúncio, sem popup, otimizada para celular",
  "Preço de R$14,99 travado para sempre — mesmo quando subir",
  "Cancele quando quiser, sem multa, sem complicação",
];

// Showcase testimonials — clearly community personas, not verified reviews
const testimonials = [
  {
    name: "Gabriel L.",
    badge: "Fundador #9",
    role: "Leitor de HQ há 8 anos",
    initials: "GL",
    text: "Finalmente uma plataforma que trata quem lê HQ como adulto. Sem anúncio, sem travamento, sem popup. Só leitura.",
  },
  {
    name: "Julio S.",
    badge: "Fundador #23",
    role: "Fã de mangá desde 2016",
    initials: "JS",
    text: "O ranking me viciou de um jeito que eu não esperava. Semana passada li 3 arcos de One Piece só para subir de posição.",
  },
  {
    name: "Rafael M.",
    badge: "Fundador #41",
    role: "Leitor de manhwa",
    initials: "RM",
    text: "Vim pelo manhwa e fiquei pela plataforma. Interface perfeita para leitura vertical. Nunca mais volto para site com popup.",
  },
];

const faqs = [
  {
    q: "O preço de R$14,99 realmente fica travado para sempre?",
    a: "Sim. Sem asterisco, sem condição escondida. Enquanto você mantiver a assinatura ativa, paga R$14,99 independente de qualquer reajuste futuro no preço da plataforma.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, a qualquer momento. Sem multa, sem burocracia, sem precisar ligar para ninguém. Basta cancelar pelo painel da conta em menos de 1 minuto.",
  },
  {
    q: "O que tem no acervo — tem o que eu leio?",
    a: "Temos HQs (Marvel, DC e independentes), mangás (Naruto, One Piece, JJK, Dragon Ball e mais) e manhwas (Solo Levelling, Tower of God, Omniscient Reader e outros). O acervo cresce semanalmente.",
  },
  {
    q: "O que é o badge de Fundador?",
    a: "Um badge exclusivo e permanente no seu perfil com o número da sua vaga (#001 a #100). É a marca de quem esteve desde o começo — não será disponibilizado para nenhum assinante que entrar depois.",
  },
  {
    q: "Como funciona o ranking?",
    a: "Você ganha pontos lendo — cada capítulo, cada saga, cada conquista desbloqueada. Todo domingo o ranking atualiza e você vê onde está entre todos os leitores da plataforma.",
  },
  {
    q: "Funciona bem no celular?",
    a: "Sim, foi feita para o celular. Leitura vertical nativa para manhwas, zoom suave para HQs e mangás, navegação fluida sem travar. Sem anúncio no meio do capítulo.",
  },
  {
    q: "O que acontece quando as 100 vagas fecharem?",
    a: "O Plano Fundador encerra e o preço sobe. Novos assinantes pagarão o preço cheio — que será maior. Quem entrou como Fundador mantém R$14,99 para sempre.",
  },
  {
    q: "Tem cobrança automática?",
    a: "Sim, a renovação é mensal e automática como qualquer assinatura. Você pode cancelar antes da próxima cobrança a qualquer momento pelo painel, sem precisar falar com ninguém.",
  },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
      >
        <span className="text-sm font-semibold text-white sm:text-base">
          {q}
        </span>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/60">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const { data: founderStatus, isLoading: founderLoading } = useFounderStatus();

  const authenticatedPath = getDefaultAuthenticatedPath(user);
  const primaryCtaHref = isAuthenticated
    ? authenticatedPath
    : SUBSCRIPTION_CHECKOUT_URL;
  const primaryCtaLabel = isAuthenticated
    ? "Abrir minha área"
    : "Garantir minha vaga de Fundador";
  const primaryCtaTarget = isAuthenticated ? undefined : "_blank";
  const primaryCtaRel = isAuthenticated ? undefined : "noreferrer";

  // Safe fallback while loading
  const status = founderStatus ?? {
    totalSlots: 100,
    claimed: 95,
    remaining: 5,
    nextNumber: 96,
    isActive: true,
  };

  const handleCta = (placement: string) => {
    if (isAuthenticated) return;
    trackFacebookPixel("InitiateCheckout", {
      content_name: "Landing Page CTA",
      content_category: "subscription",
      source: "landing_page",
      placement,
      cta_label: primaryCtaLabel,
      destination: SUBSCRIPTION_CHECKOUT_URL,
    });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-textMain">
      {/* ── Ambient glow ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-128 w-lg -translate-x-1/2 rounded-full bg-primary/18 blur-[140px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -left-32 top-128 h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
        {/* Amber founder glow */}
        <div className="absolute left-1/2 top-72 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-500/6 blur-[100px]" />
      </div>

      {/* ── Background carousel ───────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-36 z-0 opacity-40 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_78%,transparent_100%)]">
        <LandingCarousel
          sort="popular"
          limit={24}
          speed={34}
          backgroundMode
          className="bg-transparent"
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-10">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="px-5 py-5 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Logo size="md" href="/home" />
            <a
              href={primaryCtaHref}
              target={primaryCtaTarget}
              rel={primaryCtaRel}
              onClick={() => handleCta("header")}
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

        {/* ── Hero ────────────────────────────────────────────────────── */}
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
                onClick={() => handleCta("hero")}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)] transition-shadow duration-300 hover:shadow-[0_24px_56px_rgba(229,9,20,0.5)] sm:text-base"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </motion.a>
              <p className="text-xs text-white/35">
                R$14,99/mês · preço travado para sempre · cancele quando quiser
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
                { icon: Lock, text: "Cancele quando quiser" },
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

        {/* ── Founder Badge Section ───────────────────────────────────── */}
        {!isAuthenticated && (
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
                      onClick={() => handleCta("badge_section")}
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
        )}

        {/* ── Features Grid ───────────────────────────────────────────── */}
        <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
                Por que a ManHQ
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
                Feita para quem leva
                <br />
                leitura a sério.
              </h2>
            </motion.div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat, index) => (
                <motion.div
                  key={feat.title}
                  variants={sectionReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="bg-background/80 p-6 backdrop-blur-sm transition-colors duration-300 hover:bg-white/[0.03] sm:p-7"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white sm:text-base">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/50 sm:text-sm sm:leading-relaxed">
                    {feat.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing Card ────────────────────────────────────────────── */}
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
                      /mês
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-primary/70">
                    Preço de Fundador · travado enquanto você for assinante
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
                    onClick={() => handleCta("pricing")}
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

        {/* ── Testimonials ────────────────────────────────────────────── */}
        <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
                Quem já está dentro
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
                Os primeiros
                <br />
                Fundadores falam.
              </h2>
              <p className="mt-3 text-xs text-white/30">
                Opiniões de leitores da comunidade ManHQ.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {testimonials.map((item, index) => (
                <motion.div
                  key={item.name}
                  variants={sectionReveal}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 backdrop-blur-sm"
                >
                  <div className="mb-4 flex gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-white/65">
                    &ldquo;{item.text}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {item.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {item.name}
                        </span>
                        <FounderBadgePreview
                          number={parseInt(
                            item.badge.replace("Fundador #", ""),
                            10,
                          )}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-white/40">{item.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
          <div className="mx-auto max-w-3xl">
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary/80">
                Dúvidas frequentes
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
                Tudo que você precisa saber
                <br />
                antes de entrar.
              </h2>
            </motion.div>
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-white/8 bg-white/[0.02] px-6 sm:px-8"
            >
              {faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────── */}
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
                  onClick={() => handleCta("final_cta")}
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

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 px-5 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-xs text-white/30 sm:flex-row sm:justify-between">
            <p>
              © {new Date().getFullYear()} ManHQ. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <Link
                href="/termos-de-servico"
                className="transition-colors hover:text-white/50"
              >
                Termos de Serviço
              </Link>
              <Link
                href="/politica-de-privacidade"
                className="transition-colors hover:text-white/50"
              >
                Política de Privacidade
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
