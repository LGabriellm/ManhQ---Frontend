"use client";

import { motion } from "framer-motion";
import { Tv, Trophy, Star, Zap, Smartphone, Lock } from "lucide-react";

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
    title: "Pagamento único, acesso vitalício",
    description:
      "Pague uma vez e tenha acesso para sempre. Sem mensalidade, sem renovação, sem surpresa no cartão.",
  },
];

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function FeaturesSection() {
  return (
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
  );
}
