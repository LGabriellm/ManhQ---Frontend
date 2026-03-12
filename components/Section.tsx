import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionProps {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, href, icon, children }: SectionProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3.5 px-4">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
              {icon}
            </div>
          )}
          <h2 className="text-lg font-bold text-textMain tracking-tight">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-xs text-primary/80 hover:text-primary font-semibold transition-colors"
          >
            Ver tudo
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
