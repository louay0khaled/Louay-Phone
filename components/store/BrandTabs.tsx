'use client';

import { useEffect, useState } from 'react';

type Brand = { name: string; slug: string; count: number };

export default function BrandTabs({ brands }: { brands: Brand[] }) {
  const [active, setActive] = useState(brands[0]?.slug ?? '');

  useEffect(() => {
    const sections = brands
      .map((brand) => document.getElementById(`brand-${brand.slug}`))
      .filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id.replace(/^brand-/, ''));
      },
      { rootMargin: '-22% 0px -62% 0px', threshold: [0.05, 0.25, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [brands]);

  function goTo(slug: string) {
    const target = document.getElementById(`brand-${slug}`);
    if (!target) return;
    setActive(slug);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="sticky top-[73px] z-30 -mx-1 mb-12 overflow-x-auto rounded-2xl border border-sky-300/10 bg-slate-950/80 p-2 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="الشركات">
      <div className="flex min-w-max gap-2">
        {brands.map((brand) => {
          const isActive = active === brand.slug;
          return (
            <button
              key={brand.slug}
              type="button"
              onClick={() => goTo(brand.slug)}
              className={`relative rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300 ease-out ${isActive ? 'border-sky-300/25 bg-sky-400/12 text-sky-100 shadow-[0_8px_30px_rgba(14,165,233,.12)]' : 'border-transparent bg-white/[.03] text-slate-300 hover:border-sky-300/20 hover:bg-sky-400/10 hover:text-sky-200'}`}
            >
              <span className="relative z-10">{brand.name}</span>
              <span className={`mr-2 text-xs ${isActive ? 'text-sky-300' : 'text-slate-500'}`}>{brand.count}</span>
              {isActive && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,.7)]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
