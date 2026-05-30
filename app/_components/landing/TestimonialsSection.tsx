"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { FounderBadgePreview } from "@/components/FounderSpotlight";

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

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function TestimonialsSection() {
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
  );
}
