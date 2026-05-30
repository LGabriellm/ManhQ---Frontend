"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "O preço de R$14,99 é definitivo?",
    a: "Sim. Você paga exatamente R$14,99 uma única vez. Sem asterisco, sem condição escondida, sem cobrança recorrente. Depois de comprar, o acesso é seu para sempre.",
  },
  {
    q: "Tenho garantia de reembolso?",
    a: "Sim. Se não ficar satisfeito nos primeiros 7 dias, basta entrar em contato pelo suporte e devolvemos seu dinheiro integralmente. Sem perguntas, sem burocracia.",
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
    q: "É pagamento único? Tenho acesso para sempre?",
    a: "Sim. Você paga uma única vez R$14,99 e tem acesso para sempre — sem mensalidade, sem renovação automática, sem cobrança futura. É uma compra única que garante acesso vitalício à plataforma.",
  },
];

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

export function FAQSection() {
  return (
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
  );
}
