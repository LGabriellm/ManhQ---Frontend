import { HorizontalScroll } from "@/components/HorizontalScroll";

export function CardSkeleton() {
  return (
    <div className="w-32 shrink-0 snap-start">
      <div className="aspect-2/3 animate-pulse rounded-2xl bg-surface/50" />
      <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-surface/50" />
    </div>
  );
}

export function ContinueSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface/40 p-3 animate-pulse">
      <div className="h-20 w-14 rounded-xl bg-surface" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 w-2/3 rounded-full bg-surface" />
        <div className="h-3 w-1/3 rounded-full bg-surface" />
        <div className="mt-2 h-1.5 w-1/2 rounded bg-surface" />
      </div>
    </div>
  );
}

export function FeaturedSkeleton() {
  return <div className="h-72 w-full animate-pulse bg-surface/60" />;
}

export function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4">
        <div className="h-6 w-1 rounded-full animate-pulse bg-surface/70" />
        <div className="h-4 w-32 rounded-full animate-pulse bg-surface/50" />
      </div>
      <HorizontalScroll>
        {[1, 2, 3, 4, 5].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </HorizontalScroll>
    </div>
  );
}
