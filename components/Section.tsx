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
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold text-textMain">{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Ver tudo
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
