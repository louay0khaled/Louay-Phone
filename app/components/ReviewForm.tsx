'use client';

import { FormEvent, useState } from 'react';
import { trackAnalytics } from '@/lib/analytics';

type ReviewFormProps = { productId: string };

export default function ReviewForm({ productId }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setMessage('');
    trackAnalytics('review_submit', window.location.pathname, { productId, rating });
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId, rating, name, phone, orderId, comment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'تعذر إرسال التقييم.');
      setState('done');
      setMessage('وصل تقييمك بنجاح، وسيظهر بعد مراجعته من الإدارة.');
      setComment('');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'تعذر إرسال التقييم.');
    }
  }

  if (state === 'done') {
    return <div className="empty-state"><h3>شكرًا لرأيك ⭐</h3><p>{message}</p></div>;
  }

  return (
    <form onSubmit={submit} className="review-form">
      <div className="review-form__rating" aria-label="اختر تقييمك">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          return <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} نجوم`} className={value <= rating ? 'is-active' : ''}>★</button>;
        })}
      </div>
      <div className="review-form__grid">
        <label>الاسم<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>
        <label>رقم الهاتف<input value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" maxLength={40} /></label>
        <label>رقم الطلب<input value={orderId} onChange={(event) => setOrderId(event.target.value)} required placeholder="معرّف الطلب" /></label>
      </div>
      <label>تعليقك<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} maxLength={1500} placeholder="شو رأيك بالهاتف والتجربة؟" /></label>
      {message && <div role="alert" className={state === 'error' ? 'review-form__error' : 'review-form__message'}>{message}</div>}
      <button className="btn btn--dark" disabled={state === 'sending'}>{state === 'sending' ? 'جارٍ الإرسال…' : 'إرسال التقييم'}</button>
      <p className="review-form__hint">التقييم متاح فقط بعد تأكيد طلب الهاتف، ورقم الهاتف يجب أن يطابق الطلب.</p>
    </form>
  );
}
