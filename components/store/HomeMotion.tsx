'use client';

import { useEffect } from 'react';

export default function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.lp-home');
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const header = root.querySelector<HTMLElement>('[data-home-header]');
    const progress = document.createElement('div');
    progress.className = 'lp-home-scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    root.appendChild(progress);

    let scrollFrame = 0;
    let pointerFrame = 0;
    let pendingPointer: PointerEvent | null = null;

    const updateScroll = () => {
      const y = window.scrollY;
      header?.classList.toggle('scrolled', y > 35);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.setProperty('--scroll-progress', `${Math.min(1, Math.max(0, y / max))}`);
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        updateScroll();
      });
    };

    const revealNodes = root.querySelectorAll<HTMLElement>('.lp-home-stats-section, .lp-home-heading, .lp-home-brand-card, .lp-home-product-card, .lp-home-about, .lp-home-cta');
    revealNodes.forEach((node, index) => {
      node.dataset.motionReveal = 'true';
      node.style.setProperty('--motion-delay', `${Math.min(index % 5, 4) * 55}ms`);
    });

    const heroCopy = root.querySelector<HTMLElement>('.lp-home-hero-copy');
    const heroSlider = root.querySelector<HTMLElement>('.lp-home-slider-shell');
    heroCopy?.classList.add('lp-home-hero-enter');
    heroSlider?.classList.add('lp-home-hero-slider-enter');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const node = entry.target as HTMLElement;
            node.classList.add('is-in-view');
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' },
    );
    revealNodes.forEach((node) => observer.observe(node));

    const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const anchorHandlers = anchors.map((anchor) => {
      const handler = (event: Event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;
        event.preventDefault();
        const offset = (header?.getBoundingClientRect().height ?? 0) + 18;
        window.scrollTo({ top: Math.max(0, target.offsetTop - offset), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      };
      anchor.addEventListener('click', handler);
      return { anchor, handler };
    });

    const onMove = (event: PointerEvent) => {
      if (coarsePointer.matches || reducedMotion.matches) return;
      pendingPointer = event;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!pendingPointer) return;
        const x = (pendingPointer.clientX / window.innerWidth - 0.5) * 2;
        const y = (pendingPointer.clientY / window.innerHeight - 0.5) * 2;
        root.style.setProperty('--pointer-x', `${x.toFixed(2)}`);
        root.style.setProperty('--pointer-y', `${y.toFixed(2)}`);
        pendingPointer = null;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    updateScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onMove);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      observer.disconnect();
      anchorHandlers.forEach(({ anchor, handler }) => anchor.removeEventListener('click', handler));
      progress.remove();
    };
  }, []);

  return null;
}
