'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import styles from './analytics.module.css';

type Daily = { day: string; page_views: number; product_views: number; order_starts: number; chat_starts: number; review_submits: number };

export default function AnalyticsPage() {
  const [rows, setRows] = useState<Daily[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: userResult } = await supabaseBrowser.auth.getUser();
      if (!userResult.user) return;
      const { data: admin, error: adminError } = await supabaseBrowser.from('admins').select('id,is_active').eq('id', userResult.user.id).maybeSingle();
      if (adminError || !admin?.is_active) return;
      const { data, error: queryError } = await supabaseBrowser.from('analytics_daily').select('*').order('day', { ascending: false }).limit(30);
      if (!active) return;
      if (queryError) setError(queryError.message);
      setRows((data ?? []) as Daily[]);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    page_views: acc.page_views + Number(row.page_views),
    product_views: acc.product_views + Number(row.product_views),
    order_starts: acc.order_starts + Number(row.order_starts),
    chat_starts: acc.chat_starts + Number(row.chat_starts),
    review_submits: acc.review_submits + Number(row.review_submits),
  }), { page_views: 0, product_views: 0, order_starts: 0, chat_starts: 0, review_submits: 0 }), [rows]);

  if (!ready) return <main className={styles.page}><div className={styles.card}>جارٍ تحميل التحليلات…</div></main>;
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div><div className="eyebrow">LOUAY PHONE · ANALYTICS</div><h1>تحليلات المتجر</h1><p>ملخص أحداث الموقع اليومية بدون طرف ثالث.</p></div><Link href="/admin" className="btn btn--link">العودة للإدارة</Link></header>
    {error && <div className={styles.error}>{error}</div>}
    <section className={styles.metrics}>
      {Object.entries({ 'مشاهدات الصفحات': totals.page_views, 'مشاهدات المنتجات': totals.product_views, 'بدء الطلب': totals.order_starts, 'بدء المحادثة': totals.chat_starts, 'إرسال تقييم': totals.review_submits }).map(([label, value]) => <article key={label} className={styles.metric}><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <section className={styles.card}><div className="eyebrow">LAST 30 DAYS</div><h2>النشاط اليومي</h2><div className={styles.table}><div className={styles.row + ' ' + styles.head}><span>اليوم</span><span>صفحات</span><span>منتجات</span><span>طلبات</span><span>محادثات</span><span>تقييمات</span></div>{rows.map((row) => <div className={styles.row} key={row.day}><span>{row.day}</span><span>{row.page_views}</span><span>{row.product_views}</span><span>{row.order_starts}</span><span>{row.chat_starts}</span><span>{row.review_submits}</span></div>)}</div></section>
  </div></main>;
}
