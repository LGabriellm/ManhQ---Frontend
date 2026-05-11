export default function SearchLoading() {
  return (
    <main className="page-shell space-y-6">
      {/* Header */}
      <header className="space-y-4">
        <div>
          <div className="h-3 w-16 animate-pulse rounded-full bg-[#1e1e1e]" />
          <div className="mt-2 h-8 w-64 animate-pulse rounded-full bg-[#1e1e1e]" />
          <div className="mt-2 h-4 w-96 animate-pulse rounded-full bg-[#1e1e1e]" />
        </div>

        {/* Search bar skeleton */}
        <div className="surface-panel rounded-[30px] p-5">
          <div className="h-12 animate-pulse rounded-[24px] bg-[#1e1e1e]/60" />
        </div>
      </header>

      {/* Results section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-3 w-16 animate-pulse rounded-full bg-[#1e1e1e]" />
            <div className="mt-2 h-6 w-48 animate-pulse rounded-full bg-[#1e1e1e]" />
          </div>
        </div>

        {/* Result grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item}>
              <div className="aspect-2/3 animate-pulse rounded-xl bg-[#1e1e1e]/50" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-[#1e1e1e]/40" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
