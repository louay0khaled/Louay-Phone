export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-[#020617] text-white luxury-grid" aria-busy="true" aria-label="جاري تحميل المنتج">
      <div className="sticky top-0 z-40 h-[72px] border-b border-sky-300/10 bg-slate-950/75 backdrop-blur-2xl" />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-4 w-64 animate-pulse rounded bg-white/[.04]" />
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-[2rem] border border-white/[.06] bg-white/[.035]" />
          <div className="space-y-5 py-3">
            <div className="h-7 w-28 animate-pulse rounded-full bg-white/[.05]" />
            <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-white/[.06]" />
            <div className="h-4 w-28 animate-pulse rounded bg-white/[.04]" />
            <div className="h-px w-full bg-white/[.05]" />
            <div className="h-10 w-56 animate-pulse rounded-xl bg-white/[.06]" />
            <div className="space-y-3 pt-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[.04]" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
