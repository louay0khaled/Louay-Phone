'use client';

import { FormEvent, useState } from 'react';
import styles from './OrderForm.module.css';

export default function OrderForm({ productId }: { productId: string }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState('saving'); setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = { productId, name: String(form.get('name') ?? ''), phone: String(form.get('phone') ?? ''), address: String(form.get('address') ?? ''), notes: String(form.get('notes') ?? '') };
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'تعذر إرسال الطلب');
      setState('done'); setMessage(`تم استلام طلبك بنجاح. رقم الطلب: ${data.orderId}`); event.currentTarget.reset();
    } catch (error) { setState('error'); setMessage(error instanceof Error ? error.message : 'تعذر إرسال الطلب.'); }
  }

  if (state === 'done') return <div className={styles.success}><strong>تم استلام طلبك.</strong><p>{message}</p></div>;

  return <form className={styles.form} onSubmit={submit}>
    <h3>اطلب هذا الهاتف</h3><p>اترك بياناتك وسنتواصل معك لتأكيد السعر والتوفر.</p>
    <div className={styles.grid}><label className={styles.label}>الاسم<input name="name" autoComplete="name" required maxLength={120} /></label><label className={styles.label}>رقم الهاتف<input name="phone" inputMode="tel" autoComplete="tel" required maxLength={40} /></label></div>
    <label className={styles.label}>العنوان <span>(اختياري)</span><input name="address" autoComplete="street-address" maxLength={250} /></label>
    <label className={styles.label}>ملاحظات <span>(اختياري)</span><textarea name="notes" rows={4} maxLength={1000} /></label>
    {message && <div className={`${styles.message} ${state === 'error' ? styles.messageError : ''}`} role={state === 'error' ? 'alert' : undefined}>{message}</div>}
    <button className="btn btn--dark" type="submit" disabled={state === 'saving'}>{state === 'saving' ? 'جارٍ إرسال الطلب…' : 'إرسال الطلب'}</button>
  </form>;
}
