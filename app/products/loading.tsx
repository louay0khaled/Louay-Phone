export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-[#020617] text-white luxury-grid" aria-busy="true" aria-label="جاري تحميل المتجر">
      <div className="sticky top-0 z-40 h-[72px] border-b border-sky-300/10 bg-slate-950/75 backdrop-blur-2xl" />
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="h-12 w-56 animate-pulse rounded-2xl bg-white/[.06]" />
        <div className="mt-4 h-5 w-80 max-w-full animate-pulse rounded-xl bg-white/[.04]" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-[1.75rem] border border-white/[.06] bg-white/[.025] p-4">
              <div className="aspect-[4/3] animate-pulse rounded-2xl bg-white/[.05]" />
              <div className="mt-4 h-5 w-2/3 animate-pulse rounded-lg bg-white/[.05]" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded-lg bg-white/[.04]" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
