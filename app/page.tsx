const features = [
  ['01', 'اختيار احترافي', 'مواصفات واضحة وصور عالية الجودة قبل اتخاذ قرارك.'],
  ['02', 'تقسيط مرن', 'خطط تقسيط معدّة مسبقًا لكل هاتف وتظهر تفاصيلها بعد اختيار المدة.'],
  ['03', 'دعم مباشر', 'تواصل سريع مع فريق Louay Phone عبر Telegram.'],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030712] text-white luxury-grid">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#030712]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-400 font-extrabold text-slate-950">LP</div>
            <div><div className="text-lg font-extrabold tracking-tight">Louay Phone</div><div className="text-[10px] font-medium text-slate-400">PREMIUM SMARTPHONES</div></div>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex"><a href="#products" className="transition hover:text-sky-300">الهواتف</a><a href="#features" className="transition hover:text-sky-300">لماذا نحن</a><a href="#contact" className="transition hover:text-sky-300">تواصل معنا</a></nav>
          <a href="#products" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-300">تصفح الهواتف</a>
        </div>
      </header>

      <section className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/5 px-4 py-2 text-xs font-semibold text-sky-300"><span className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_14px_#38bdf8]" /> تجربة هاتف مختلفة</div>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.15] tracking-tight sm:text-6xl lg:text-7xl">هاتفك القادم،<br /><span className="text-sky-400">بثقة وأناقة.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">اكتشف مجموعة مختارة من أحدث الهواتف، بمعلومات دقيقة، صور واضحة، وخيارات تقسيط شفافة تناسب اختيارك.</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#products" className="rounded-2xl bg-sky-400 px-7 py-3.5 font-extrabold text-slate-950 transition hover:bg-sky-300">استكشف الهواتف</a><a href="#contact" className="rounded-2xl border border-white/10 bg-white/5 px-7 py-3.5 font-bold text-white transition hover:bg-white/10">تواصل معنا</a></div>
        </div>
        <div className="relative mx-auto w-full max-w-md"><div className="absolute inset-8 rounded-full bg-sky-500/15 blur-3xl" /><div className="glass glow relative aspect-[4/5] overflow-hidden rounded-[2rem] p-6"><div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-sky-400/10 bg-gradient-to-br from-slate-800/80 to-slate-950 p-6"><div className="text-xs font-bold tracking-[.25em] text-sky-300">LOUAY PHONE</div><div className="mx-auto flex h-56 w-32 rotate-6 items-center justify-center rounded-[2rem] border-4 border-slate-600 bg-slate-900 shadow-2xl shadow-sky-500/10"><div className="h-36 w-2 rounded-full bg-sky-400/20" /></div><div><div className="text-sm text-slate-400">PREMIUM COLLECTION</div><div className="mt-1 text-2xl font-extrabold">أحدث التقنيات</div></div></div></div></div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="grid gap-4 md:grid-cols-3">{features.map(([n, title, text]) => <article key={n} className="glass rounded-3xl p-6"><div className="text-xs font-bold text-sky-400">{n}</div><h2 className="mt-6 text-xl font-extrabold">{title}</h2><p className="mt-3 text-sm leading-7 text-slate-400">{text}</p></article>)}</div></section>

      <section id="products" className="mx-auto max-w-7xl px-5 py-20 lg:px-8"><div className="mb-8 flex items-end justify-between"><div><div className="text-sm font-bold text-sky-400">COLLECTION</div><h2 className="mt-2 text-3xl font-extrabold">الهواتف المميزة</h2></div><span className="text-sm text-slate-500">سيتم تحميل المنتجات من Supabase</span></div><div className="glass rounded-3xl p-10 text-center text-slate-400">منظومة المنتجات ولوحة التحكم قيد البناء.</div></section>

      <footer id="contact" className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div><div className="font-extrabold">Louay Phone</div><div className="mt-1 text-sm text-slate-500">هواتف ذكية، تجربة راقية.</div></div><div className="text-sm text-slate-500">الدفع عند الاستلام • دعم عبر Telegram</div></div></footer>
    </main>
  );
}
