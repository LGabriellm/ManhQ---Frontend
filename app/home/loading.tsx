export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-28">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 border-b border-white/4 bg-[#0f0f0f]/85 backdrop-blur-2xl">
        <div className="flex h-14 items-center justify-between px-5">
          {/* Logo placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 animate-pulse rounded-lg bg-[#1e1e1e]" />
            <div className="h-4 w-14 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
          {/* Search icon placeholder */}
          <div className="h-4.5 w-4.5 animate-pulse rounded-xl bg-[#1e1e1e]" />
        </div>
      </div>

      <div className="space-y-7 pt-5">
        {/* Greeting skeleton */}
        <div className="space-y-1.5 px-5">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#1e1e1e]" />
          <div className="h-6 w-44 animate-pulse rounded-full bg-[#1e1e1e]" />
          <div className="h-3 w-36 animate-pulse rounded-full bg-[#1e1e1e]" />
        </div>

        {/* Featured banner skeleton */}
        <div className="h-72 w-full animate-pulse bg-[#1e1e1e]/60" />

        {/* Continue reading skeleton */}
        <div className="space-y-3 px-4">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full animate-pulse bg-[#1e1e1e]" />
            <div className="h-4 w-36 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
          <div className="flex gap-3 rounded-2xl bg-[#1e1e1e]/40 p-3 animate-pulse">
            <div className="h-20 w-14 rounded-xl bg-[#1e1e1e]" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-2/3 rounded-full bg-[#1e1e1e]" />
              <div className="h-3 w-1/3 rounded-full bg-[#1e1e1e]" />
              <div className="mt-2 h-1.5 w-1/2 rounded bg-[#1e1e1e]" />
            </div>
          </div>
        </div>

        {/* Section skeletons */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="space-y-3">
            <div className="flex items-center gap-3 px-4">
              <div className="h-6 w-1 rounded-full animate-pulse bg-[#1e1e1e]" />
              <div className="h-4 w-32 rounded-full animate-pulse bg-[#1e1e1e]" />
            </div>
            <div className="flex gap-3 overflow-hidden px-4">
              {[1, 2, 3, 4, 5, 6].map((card) => (
                <div key={card} className="w-32 shrink-0">
                  <div className="aspect-2/3 animate-pulse rounded-2xl bg-[#1e1e1e]/50" />
                  <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-[#1e1e1e]/50" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
