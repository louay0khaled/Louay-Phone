'use client';

import { useEffect, useRef, useState } from 'react';
type Message = { id: string; sender_type: string; message_text: string; created_at: string };

export default function LiveChatWidget() {
  const [open, setOpen] = useState(false); const [ticketId, setTicketId] = useState(''); const [messages, setMessages] = useState<Message[]>([]); const [message, setMessage] = useState(''); const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const endRef = useRef<HTMLDivElement>(null);

  async function load() { try { const res = await fetch('/api/chat', { cache: 'no-store' }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر الاتصال'); setTicketId(data.ticketId || ''); setMessages(data.messages || []); setError(''); if (data.visitorName) setName(data.visitorName); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الاتصال'); } finally { setLoading(false); } }

  useEffect(() => {
    void load();
    const openHandler = () => setOpen(true);
    const contactButtons = Array.from(document.querySelectorAll<HTMLElement>('[data-open-chat]'));
    const contactHandler = () => setOpen(true);
    window.addEventListener('louay:open-chat', openHandler);
    contactButtons.forEach((el) => el.addEventListener('click', contactHandler));
    return () => { window.removeEventListener('louay:open-chat', openHandler); contactButtons.forEach((el) => el.removeEventListener('click', contactHandler)); };
  }, []);

  useEffect(() => { if (!open) return; void load(); const timer = window.setInterval(() => void load(), 2500); return () => window.clearInterval(timer); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function send() { const text = message.trim(); if (!text || !ticketId || busy) return; setBusy(true); setError(''); try { const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId, message: text, name: name.trim() || undefined }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرسالة'); setMessage(''); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إرسال الرسالة'); } finally { setBusy(false); } }

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label="تواصل معنا" className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500 text-white shadow-2xl shadow-sky-500/30 transition hover:scale-105">💬</button>
    {open && <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm sm:items-end sm:justify-end sm:p-5">
      <section className="flex h-[min(680px,92vh)] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-950 sm:rounded-[2rem]" aria-label="المحادثة المباشرة">
        <header className="flex items-center justify-between bg-sky-500 px-5 py-4 text-white"><div><h2 className="font-black">تواصل معنا</h2><p className="text-xs text-white/80">نحن هنا لمساعدتك</p></div><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" className="rounded-full px-3 py-2 text-xl hover:bg-white/10">×</button></header>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">{loading ? <p className="py-16 text-center text-sm text-slate-500">جارٍ فتح المحادثة...</p> : messages.length === 0 ? <div className="py-16 text-center"><div className="text-4xl">👋</div><p className="mt-4 font-bold">أهلًا وسهلًا!</p><p className="mt-1 text-sm text-slate-500">اكتب استفسارك وسنرد عليك هنا.</p></div> : messages.map(m => <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.sender_type === 'user' ? 'bg-sky-500 text-white' : 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'}`}>{m.message_text}</div></div>)}<div ref={endRef}/></div>
        <div className="border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"><input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك (اختياري)" maxLength={80} className="mb-2 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-500 dark:border-white/10" />{error && <p className="mb-2 text-xs text-red-500">{error}</p>}<div className="flex gap-2"><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder="اكتب رسالتك..." maxLength={2000} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-sky-500 dark:border-white/10" /><button disabled={busy || !message.trim() || !ticketId} onClick={() => void send()} className="rounded-xl bg-sky-500 px-5 font-black text-white disabled:opacity-40">{busy ? '...' : 'إرسال'}</button></div></div>
      </section>
    </div>}
  </>;
}
