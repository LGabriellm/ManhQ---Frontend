"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Crown,
  Flame,
  Heart,
  Library,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CHECKOUT_URL =
  "https://pay.kirvano.com/fa717258-dae4-4eea-9368-970ee9cee695";

const highlights = [
  {
    icon: Flame,
    title: "Atualizações frequentes",
    description:
      "Novos capítulos e títulos chegando em ritmo constante para manter o catálogo sempre vivo.",
  },
  {
    icon: Smartphone,
    title: "Experiência mobile-first",
    description:
      "Leitura rápida, interface limpa e navegação pensada para celular sem sacrificar desktop.",
  },
  {
    icon: Library,
    title: "Biblioteca organizada",
    description:
      "Salve favoritos, acompanhe progresso e volte exatamente de onde parou em segundos.",
  },
  {
    icon: Users,
    title: "Comunidade integrada",
    description:
      "Discuta capítulos, compartilhe teorias e acompanhe a reação da comunidade dentro da plataforma.",
  },
];

const benefits = [
  "Catálogo curado com foco em leitura fluida",
  "Acesso rápido ao que você está lendo agora",
  "Visual premium com navegação simples e objetiva",
  "Perfil com progresso, histórico e favoritos",
  "Ambiente contínuo para descoberta e retenção",
  "Interface otimizada para sessões longas de leitura",
];

const featureCards = [
  {
    eyebrow: "Descoberta",
    title: "Encontre sua próxima obsessão em minutos",
    description:
      "Destaques certeiros, catálogo organizado e atalhos rápidos para você começar a ler sem perder tempo.",
    stat: "+ descobertas",
    icon: Sparkles,
  },
  {
    eyebrow: "Retenção",
    title: "Continue de onde parou sem atrito",
    description:
      "Abra o ManHQ e retome sua leitura no ponto exato, com menos fricção e mais continuidade.",
    stat: "+ conforto",
    icon: Zap,
  },
  {
    eyebrow: "Prestígio",
    title: "Experiência premium de verdade",
    description:
      "Um visual elegante, leitura fluida e navegação limpa para fazer a assinatura parecer valer cada centavo.",
    stat: "+ valor",
    icon: Crown,
  },
];

const steps = [
  {
    step: "01",
    title: "Assine e desbloqueie o acesso",
    description:
      "Entre no checkout, conclua sua assinatura e receba o acesso para começar sua experiência no ManHQ.",
  },
  {
    step: "02",
    title: "Descubra, salve e acompanhe",
    description:
      "Monte sua biblioteca, favorite séries e mantenha seu progresso sempre sincronizado.",
  },
  {
    step: "03",
    title: "Leia com constância",
    description:
      "Retome capítulos, acompanhe novidades e transforme leitura em hábito recorrente.",
  },
];

const faqs = [
  {
    question: "O que torna o ManHQ diferente?",
    answer:
      "O ManHQ une catálogo, progresso contínuo, favoritos e comunidade em uma experiência premium focada em leitura de verdade.",
  },
  {
    question: "A plataforma funciona bem no celular?",
    answer:
      "Sim. O produto foi estruturado com prioridade para mobile, com leitura rápida, navegação leve e baixa fricção.",
  },
  {
    question: "Consigo voltar exatamente para onde parei?",
    answer:
      "Sim. O ManHQ registra progresso e facilita retomar capítulos e páginas em andamento.",
  },
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

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-textMain">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-128 w-lg -translate-x-1/2 rounded-full bg-primary/18 blur-[140px]" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -left-32 top-128 h-72 w-72 rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <section className="relative px-5 pb-16 pt-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72 backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(229,9,20,0.7)]" />
                streaming reading experience
              </div>
              <p className="mt-4 font-display text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                ManHQ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={isAuthenticated ? "/library" : "/auth/login"}
                className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm font-medium text-textMain transition-colors hover:border-primary/25 hover:bg-white/7"
              >
                {isAuthenticated ? "Abrir biblioteca" : "Entrar"}
              </Link>
              <a
                href={CHECKOUT_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(229,9,20,0.34)] transition-transform hover:scale-[1.02]"
              >
                Assinar agora
              </a>
            </div>
          </div>

          <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  assinatura premium para leitores exigentes
                </div>

                <h1 className="max-w-4xl font-display text-[2.8rem] font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-[4.4rem] lg:text-[5.4rem]">
                  Assine uma experiência de leitura que parece streaming
                  premium.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                  Entre no ManHQ para ler com conforto, continuar de onde parou,
                  descobrir novas séries e viver tudo isso em uma interface
                  rápida, elegante e feita para maratonar capítulos.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href={CHECKOUT_URL} target="_blank" rel="noreferrer">
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)]"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Assinar e começar agora
                    </motion.div>
                  </a>

                  <a href={CHECKOUT_URL} target="_blank" rel="noreferrer">
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-6 py-4 text-sm font-semibold text-textMain backdrop-blur-xl transition-colors hover:border-primary/20 hover:bg-white/7"
                    >
                      Ver oferta completa
                      <ChevronRight className="h-4 w-4" />
                    </motion.div>
                  </a>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  {[
                    { value: "UX", label: "focada em retenção" },
                    { value: "24/7", label: "catálogo disponível" },
                    { value: "Mobile", label: "primeiro de verdade" },
                  ].map((item) => (
                    <GlassCard key={item.label} className="p-4">
                      <p className="text-2xl font-bold text-white">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-white/60">{item.label}</p>
                    </GlassCard>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="relative"
            >
              <GlassCard className="overflow-hidden p-3 sm:p-4">
                <div className="rounded-3xl border border-white/8 bg-black/35 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                        premium reader flow
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        Tudo o que faz sua assinatura valer a pena desde o
                        primeiro toque
                      </p>
                    </div>
                    <div className="rounded-2xl bg-primary/16 p-3 text-primary">
                      <Crown className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            Continue lendo
                          </p>
                          <p className="text-xs text-white/52">
                            Retome exatamente do ponto em que você parou
                          </p>
                        </div>
                        <div className="rounded-full bg-primary/14 px-3 py-1 text-[11px] font-semibold text-primary">
                          leitura contínua
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-white/7">
                        <div className="h-full w-[74%] rounded-full bg-linear-to-r from-primary to-[#ff7a84]" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <Heart className="h-5 w-5 fill-primary" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          Biblioteca e favoritos
                        </p>
                        <p className="mt-1 text-xs leading-6 text-white/55">
                          Guarde séries, acompanhe favoritos e monte sua rotina
                          de leitura sem confusão.
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          Descoberta contínua
                        </p>
                        <p className="mt-1 text-xs leading-6 text-white/55">
                          Novidades, destaques e recomendações para você sempre
                          ter algo bom para ler.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
            >
              <GlassCard className="h-full p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  {item.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              por que assinar
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              Tudo foi pensado para deixar sua leitura mais prazerosa, prática e
              viciante.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featureCards.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
              >
                <GlassCard className="h-full p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                      {item.eyebrow}
                    </span>
                    <div className="rounded-2xl bg-primary/12 p-2.5 text-primary">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">
                    {item.description}
                  </p>
                  <div className="mt-6 inline-flex rounded-full border border-primary/18 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {item.stat}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
              benefícios principais
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white">
              Uma assinatura boa precisa melhorar sua rotina de leitura.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/58">
              O ManHQ entrega acesso, conforto, organização e continuidade para
              você ler mais e melhor todos os dias.
            </p>
          </GlassCard>

          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
              >
                <GlassCard className="flex h-full items-start gap-3 p-5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-7 text-white/68">{item}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              jornada do usuário
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              Da ativação ao hábito de leitura.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
              >
                <GlassCard className="h-full p-6">
                  <p className="text-4xl font-bold tracking-[-0.05em] text-primary/85">
                    {item.step}
                  </p>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">
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
                  oferta
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
                  Assine para ter acesso a uma experiência completa de leitura.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                  Não é só abrir capítulos. É ter catálogo, progresso,
                  favoritos, descoberta e comunidade dentro de uma experiência
                  premium e fluida.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-black/30 p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Assinatura premium
                    </p>
                    <p className="mt-1 text-xs text-white/52">
                      Acesso pensado para leitores que querem conforto e
                      constância
                    </p>
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                    acesso imediato
                  </div>
                </div>

                <div className="mb-5 border-b border-white/8 pb-5">
                  <p className="text-5xl font-bold tracking-[-0.06em] text-white">
                    Premium
                  </p>
                  <p className="mt-2 text-sm text-white/58">
                    Entre para ler com continuidade, salvar favoritos,
                    acompanhar seu progresso e aproveitar o catálogo completo.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    "Acesso ao ecossistema completo do ManHQ",
                    "Experiência de leitura contínua",
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
                    className="flex-1"
                  >
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.33)]">
                      Assinar pela Kirvano
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

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              perguntas frequentes
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              O que você precisa saber antes de assinar.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
              >
                <GlassCard className="p-5 sm:p-6">
                  <p className="text-lg font-semibold text-white">
                    {faq.question}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/58">
                    {faq.answer}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-18 pt-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <GlassCard className="relative overflow-hidden border-primary/16 bg-linear-to-br from-primary/16 via-white/5 to-white/2 p-8 text-center sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-[110px]" />
            <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
              call to action final
            </p>
            <h2 className="relative mt-4 font-display text-3xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
              {isAuthenticated
                ? `Pronto para voltar, ${user?.name?.split(" ")[0] || "leitor"}?`
                : "Assine agora e desbloqueie uma experiência premium de leitura no ManHQ."}
            </h2>
            <p className="relative mx-auto mt-4 max-w-3xl text-sm leading-7 text-white/64 sm:text-base">
              Tenha acesso ao catálogo, leitura contínua, favoritos, progresso e
              uma interface que faz você querer voltar todos os dias.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={CHECKOUT_URL} target="_blank" rel="noreferrer">
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-white shadow-[0_18px_44px_rgba(229,9,20,0.35)]">
                  Assinar agora pela Kirvano
                </div>
              </a>
              <Link href={isAuthenticated ? "/search" : "/auth/login"}>
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-textMain backdrop-blur-xl">
                  {isAuthenticated ? "Explorar catálogo" : "Já sou assinante"}
                </div>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </main>
  );
}
