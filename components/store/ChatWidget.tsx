'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { id: string; senderType: string; text: string; createdAt: string };
const TOKEN_KEY = 'louay_phone_chat_token';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [token, setToken] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function openSession() {
    setLoading(true); setError('');
    try {
      const saved = localStorage.getItem(TOKEN_KEY) || undefined;
      const res = await fetch('/api/chat/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: saved, name: name || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر فتح المحادثة');
      localStorage.setItem(TOKEN_KEY, data.token); setToken(data.token); setTicketId(data.ticketId); setName(data.visitorName || name); await refresh(data.token);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المحادثة'); } finally { setLoading(false); }
  }

  async function refresh(currentToken = token) {
    if (!currentToken) return;
    try { const res = await fetch('/api/chat/messages/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken }), cache: 'no-store' }); const data = await res.json(); if (res.ok) { setMessages(data.messages || []); setTicketId(data.ticketId || ''); } } catch {}
  }

  async function sendMessage() {
    const text = draft.trim(); if (!text || sending) return;
    setSending(true); setError('');
    try {
      if (!token) await openSession();
      const currentToken = token || localStorage.getItem(TOKEN_KEY) || '';
      const res = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken, text, name: name.trim() || undefined }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرسالة');
      setDraft(''); setTicketId(data.ticketId || ticketId); await refresh(currentToken);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إرسال الرسالة'); } finally { setSending(false); }
  }

  useEffect(() => { if (open) { openSession(); } }, [open]);
  useEffect(() => { if (!open || !token) return; const timer = window.setInterval(() => refresh(), 2500); return () => window.clearInterval(timer); }, [open, token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return <>
    <button aria-label="تواصل معنا" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-2xl text-white shadow-2xl shadow-sky-500/30 transition hover:scale-105">💬</button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/30 p-0 backdrop-blur-[2px] sm:items-end sm:justify-end sm:p-5" dir="rtl">
      <div className="flex h-[min(680px,100dvh)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-950 sm:h-[680px] sm:rounded-3xl">
        <header className="flex items-center justify-between bg-sky-500 px-5 py-4 text-white"><div><h2 className="font-black">تواصل معنا</h2><p className="text-xs text-white/80">نحن هنا لمساعدتك</p></div><button aria-label="إغلاق" onClick={() => setOpen(false)} className="rounded-full px-3 py-1 text-xl hover:bg-white/10">×</button></header>
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-900">{!name && !token && <div className="mx-auto mt-10 max-w-xs text-center"><div className="text-4xl">👋</div><h3 className="mt-3 text-xl font-black">أهلًا وسهلًا</h3><p className="mt-2 text-sm text-slate-500">اكتب اسمك لنبدأ المحادثة معك.</p><input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-sky-500 dark:border-white/10 dark:bg-slate-950" /><button onClick={openSession} disabled={loading || name.trim().length < 2} className="mt-3 w-full rounded-2xl bg-sky-500 px-4 py-3 font-black text-white disabled:opacity-50">{loading ? 'جارٍ البدء...' : 'بدء المحادثة'}</button></div>}
          {(token || name) && <>{messages.length === 0 && <div className="mt-10 text-center text-sm text-slate-400">اكتب رسالتك وسنرد عليك بأسرع وقت.</div>}{messages.map(m => <div key={m.id} className={`mb-3 flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.senderType === 'user' ? 'rounded-br-md bg-sky-500 text-white' : 'rounded-bl-md bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'}`}>{m.text}</div></div>)}<div ref={bottomRef} /></>}
          {error && <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">{error}</p>}
        </div>
        <div className="border-t border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"><div className="flex gap-2"><input disabled={!token} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder={token ? 'اكتب رسالتك...' : 'ابدأ المحادثة أولًا'} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-transparent px-4 py-3 text-sm outline-none focus:border-sky-500 disabled:opacity-50 dark:border-white/10" /><button disabled={!token || !draft.trim() || sending} onClick={sendMessage} className="rounded-2xl bg-sky-500 px-5 font-black text-white disabled:opacity-50">{sending ? '...' : 'إرسال'}</button></div>{ticketId && <p className="mt-2 text-center text-[10px] text-slate-400">المحادثة محفوظة ويمكنك العودة إليها من هذا الجهاز.</p>}</div>
      </div>
    </div>}
  </>;
}
