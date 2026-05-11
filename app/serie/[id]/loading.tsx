export default function SerieLoading() {
  return (
    <main className="min-h-screen bg-[#0f0f0f] pb-20">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 border-b border-[#1e1e1e] bg-[#0f0f0f]/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between p-4">
          {/* Back button placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-[#1e1e1e]" />
            <div className="h-4 w-14 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
          {/* Actions placeholder */}
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="h-6 w-6 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-6">
        {/* Hero section: cover + info */}
        <div className="flex gap-4">
          {/* Cover skeleton */}
          <div className="h-40 w-28 shrink-0 animate-pulse rounded-xl bg-[#1e1e1e]/60" />

          {/* Info skeleton */}
          <div className="flex flex-1 flex-col justify-center space-y-2">
            <div className="h-7 w-3/4 animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-lg bg-[#1e1e1e]" />
              <div className="h-5 w-20 animate-pulse rounded-lg bg-[#1e1e1e]" />
            </div>
            <div className="flex gap-3">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[#1e1e1e]" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-[#1e1e1e]" />
            </div>
          </div>
        </div>

        {/* Read button skeleton */}
        <div className="flex gap-3">
          <div className="h-14 flex-1 animate-pulse rounded-xl bg-[#e50914]/30" />
          <div className="h-14 w-14 animate-pulse rounded-xl bg-[#1e1e1e]/50" />
        </div>

        {/* Genre tags */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-7 w-20 animate-pulse rounded-full bg-[#1e1e1e]/50"
            />
          ))}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#1e1e1e] bg-[#1e1e1e]/30 p-4"
            >
              <div className="mx-auto mb-2 h-5 w-5 rounded bg-[#1e1e1e]" />
              <div className="mx-auto h-6 w-10 rounded-full bg-[#1e1e1e]" />
              <div className="mx-auto mt-1 h-3 w-16 rounded-full bg-[#1e1e1e]" />
            </div>
          ))}
        </div>

        {/* Synopsis skeleton */}
        <div className="space-y-2 rounded-xl border border-[#1e1e1e] bg-[#1e1e1e]/30 p-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-[#1e1e1e]" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
        </div>

        {/* Chapters list */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-[#1e1e1e]" />
            <div className="h-5 w-28 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>

          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-xl border border-[#1e1e1e] bg-[#1e1e1e]/30 p-4 animate-pulse"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#1e1e1e]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded-full bg-[#1e1e1e]" />
                <div className="h-3 w-1/3 rounded-full bg-[#1e1e1e]" />
              </div>
              <div className="h-4 w-4 rounded bg-[#1e1e1e]" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
