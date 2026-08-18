'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageLoading({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return <div className="lp-state lp-state--loading" role="status" aria-live="polite"><span className="lp-spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export function EmptyState({ title = 'لا توجد نتائج حاليًا', description, actionHref = '/', actionLabel = 'العودة للرئيسية' }: { title?: string; description?: string; actionHref?: string; actionLabel?: string }) {
  return <section className="lp-state lp-state--empty" aria-labelledby="empty-title"><div className="lp-state__icon" aria-hidden="true">✦</div><h2 id="empty-title">{title}</h2>{description && <p>{description}</p>}<Link href={actionHref} className="luxury-button-secondary">{actionLabel}</Link></section>;
}

export function ErrorState({ title = 'حدث خطأ غير متوقع', description = 'حاول مرة أخرى بعد لحظات.' }: { title?: string; description?: string }) {
  return <section className="lp-state lp-state--error" role="alert"><div className="lp-state__icon" aria-hidden="true">!</div><h2>{title}</h2><p>{description}</p><button type="button" className="luxury-button-secondary" onClick={() => window.location.reload()}>إعادة المحاولة</button></section>;
}

export function ModalFrame({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return <div className="lp-modal" role="presentation"><button className="lp-modal__backdrop" aria-label="إغلاق" onClick={onClose} /><section className="lp-modal__panel" role="dialog" aria-modal="true" aria-label={title}><div className="lp-modal__header"><h2>{title}</h2><button className="lp-icon-button" type="button" onClick={onClose} aria-label="إغلاق">×</button></div><div className="lp-modal__body">{children}</div></section></div>;
}
