'use client';

import { useEffect } from 'react';

export default function OrdersError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin orders route error');
  }, []);

  return <section className="min-h-[70vh] p-5 lg:p-10"><div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center"><div className="lp-surface w-full rounded-3xl p-8 text-center"><p className="text-xs font-black tracking-[.16em] text-red-300">ORDER CONTROL ERROR</p><h1 className="mt-3 text-2xl font-black">تعذر تحميل الطلبات</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">صار خطأ أثناء جلب بيانات الطلبات. جرّب إعادة المحاولة، وإذا بقي الخطأ راجع اتصال Supabase وسجلات التطبيق.</p><button type="button" onClick={() => reset()} className="luxury-button mt-6">إعادة المحاولة</button></div></div></section>;
}
