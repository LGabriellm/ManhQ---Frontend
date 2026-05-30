import Link from "next/link";
import dynamic from "next/dynamic";

import { HeaderSection } from "./_components/landing/HeaderSection";
import { HeroSection } from "./_components/landing/HeroSection";

const LandingCarousel = dynamic(
  () =>
    import("@/components/InfiniteCarousel").then((mod) => mod.InfiniteCarousel)
);

const VideoSection = dynamic(
  () => import("./_components/landing/VideoSection").then((m) => m.VideoSection)
);

const FounderBadgeSection = dynamic(
  () => import("./_components/landing/FounderBadgeSection").then((m) => m.FounderBadgeSection)
);

const FeaturesSection = dynamic(
  () => import("./_components/landing/FeaturesSection").then((m) => m.FeaturesSection)
);

const PricingSection = dynamic(
  () => import("./_components/landing/PricingSection").then((m) => m.PricingSection)
);

const TestimonialsSection = dynamic(
  () => import("./_components/landing/TestimonialsSection").then((m) => m.TestimonialsSection)
);

const FAQSection = dynamic(
  () => import("./_components/landing/FAQSection").then((m) => m.FAQSection)
);

const FinalCtaSection = dynamic(
  () => import("./_components/landing/FinalCtaSection").then((m) => m.FinalCtaSection)
);

export default function LandingPage() {
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
        <HeaderSection />
        <HeroSection />
        <VideoSection />
        <FounderBadgeSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <FinalCtaSection />

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
