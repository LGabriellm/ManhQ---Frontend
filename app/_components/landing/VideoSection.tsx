"use client";

import { motion } from "framer-motion";
import { useLandingVideoInfo } from "@/hooks/useLandingVideo";

const sectionReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

export function VideoSection() {
  const { data: videoInfo } = useLandingVideoInfo();

  if (!videoInfo?.active) return null;

  return (
    <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className={`mx-auto ${videoInfo.format === "mobile" ? "max-w-sm" : "max-w-5xl"}`}>
        <motion.div
          variants={sectionReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.6 }}
        >
          {/* Label */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2">
              <span className="h-px w-8 bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
                Veja em ação
              </span>
              <span className="h-px w-8 bg-primary/40" />
            </div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              A experiência ManhQ,{" "}
              <span className="text-primary">sem anúncio. Sem popup.</span>
            </h2>
          </div>

          {/* Desktop frame */}
          {videoInfo.format !== "mobile" && (
            <div className="relative">
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/20 via-transparent to-transparent" />
              <div className="pointer-events-none absolute -inset-[2px] rounded-2xl border border-primary/12" />
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{ boxShadow: "0 0 80px rgba(229,9,20,0.10), 0 0 160px rgba(229,9,20,0.05)" }}
              />
              <div className="flex items-center gap-1.5 rounded-t-2xl border-x border-t border-white/8 bg-[#141414] px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <div className="mx-3 flex-1 rounded-md bg-white/5 px-3 py-1 text-center text-[10px] text-white/20">
                  manhq.com.br
                </div>
                <span className="h-5 w-px bg-white/8" />
                <div className="ml-2 h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_rgba(229,9,20,0.8)]" />
              </div>
              <div className="overflow-hidden rounded-b-2xl border-x border-b border-white/8 bg-black aspect-video">
                <video
                  src={videoInfo?.streamUrl ?? "/api/landing-video/stream"}
                  autoPlay muted loop playsInline controls
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Mobile phone frame */}
          {videoInfo.format === "mobile" && (
            <div className="relative mx-auto" style={{ width: 270 }}>
              {/* Ambient glow */}
              <div
                className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-28 w-56 rounded-full blur-[50px]"
                style={{ background: "rgba(229,9,20,0.12)" }}
              />
              {/* Side buttons */}
              <div className="absolute -left-[7px] top-16 h-5 w-[5px] rounded-l bg-[#2c2c2e] z-10" />
              <div className="absolute -left-[7px] top-[88px] h-8 w-[5px] rounded-l bg-[#2c2c2e] z-10" />
              <div className="absolute -left-[7px] top-[124px] h-8 w-[5px] rounded-l bg-[#2c2c2e] z-10" />
              <div className="absolute -right-[7px] top-[100px] h-12 w-[5px] rounded-r bg-[#2c2c2e] z-10" />
              {/* Phone body */}
              <div
                className="relative overflow-hidden bg-black"
                style={{
                  aspectRatio: "9/19",
                  borderRadius: "2.6rem",
                  border: "6px solid #1c1c1e",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.07), 0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(229,9,20,0.07)",
                }}
              >
                {/* Video */}
                <video
                  src={videoInfo?.streamUrl ?? "/api/landing-video/stream"}
                  autoPlay muted loop playsInline controls
                  className="absolute inset-0 w-full h-full"
                />
                {/* Dynamic island */}
                <div className="relative z-10 flex justify-center pt-3 pb-1">
                  <div
                    className="h-[24px] w-[88px] rounded-full bg-black"
                    style={{ border: "1px solid rgba(255,255,255,0.05)" }}
                  />
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center py-3">
                  <div className="h-[4px] w-24 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          )}

          {/* Sub-caption */}
          <p className="mt-6 text-center text-xs text-white/30">
            Interface real · sem cortes · sem edição
          </p>
        </motion.div>
      </div>
    </section>
  );
}
