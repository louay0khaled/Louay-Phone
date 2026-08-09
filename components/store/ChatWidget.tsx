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

  async function refresh(currentToken = token) {
    if (!currentToken) return;
    try {
      const res = await fetch('/api/chat/messages/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken }), cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        setTicketId(data.ticketId || '');
        setName((current) => current || data.visitorName || '');
      }
    } catch {}
  }

  async function ensureSession(preferredName?: string) {
    const saved = localStorage.getItem(TOKEN_KEY) || undefined;
    const res = await fetch('/api/chat/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: saved, name: preferredName?.trim() || name.trim() || undefined }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر فتح المحادثة');
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setTicketId(data.ticketId || '');
    if (data.visitorName) setName(data.visitorName);
    return data.token as string;
  }

  async function openSession() {
    setLoading(true);
    setError('');
    try {
      const currentToken = await ensureSession();
      await refresh(currentToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر فتح المحادثة');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const currentToken = token || await ensureSession();
      const res = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken, text, name: name.trim() || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرسالة');
      setDraft('');
      setTicketId(data.ticketId || ticketId);
      await refresh(currentToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const openChat = () => { setOpen(true); void openSession(); };
    const onGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-open-chat]')) openChat();
    };

    window.addEventListener('louay:open-chat', openChat);
    document.addEventListener('click', onGlobalClick, true);

    return () => {
      window.removeEventListener('louay:open-chat', openChat);
      document.removeEventListener('click', onGlobalClick, true);
    };
  }, []);

  useEffect(() => { if (open && !token) void openSession(); }, [open]);
  useEffect(() => { if (!open || !token) return; const timer = window.setInterval(() => void refresh(), 2000); return () => window.clearInterval(timer); }, [open, token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return <>
    <button aria-label="تواصل معنا" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-sky-300/30 bg-sky-500 text-2xl text-white shadow-[0_12px_40px_rgba(14,165,233,.35)] transition hover:scale-105">💬</button>
    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-end sm:justify-end sm:p-5" dir="rtl">
      <div className="flex h-[min(700px,100dvh)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-sky-400/20 bg-slate-950 text-white shadow-[0_25px_100px_rgba(0,0,0,.55)] sm:h-[700px] sm:rounded-[28px]">
        <header className="relative overflow-hidden border-b border-sky-300/15 bg-gradient-to-l from-sky-500 via-sky-500 to-slate-950 px-5 py-5"><div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" /><div className="relative flex items-center justify-between"><div><h2 className="font-black tracking-tight">تواصل معنا</h2><p className="mt-1 text-xs text-white/75">دعم مباشر من Louay Phone</p></div><button aria-label="إغلاق" onClick={() => setOpen(false)} className="rounded-full border border-white/15 bg-black/10 px-3 py-1 text-xl hover:bg-white/10">×</button></div></header>
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 p-4">
          {!token && !name && <div className="mx-auto mt-10 max-w-xs text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-300/20 bg-sky-400/10 text-3xl shadow-lg shadow-sky-500/10">👋</div><h3 className="mt-4 text-xl font-black">أهلًا وسهلًا</h3><p className="mt-2 text-sm text-slate-400">اكتب اسمك لنبدأ المحادثة معك.</p><input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" className="mt-5 w-full rounded-2xl border border-sky-300/15 bg-slate-900 px-4 py-3 text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400" /><button onClick={openSession} disabled={loading || name.trim().length < 2} className="mt-3 w-full rounded-2xl bg-sky-500 px-4 py-3 font-black text-white shadow-lg shadow-sky-500/20 disabled:opacity-50">{loading ? 'جارٍ البدء...' : 'بدء المحادثة'}</button></div>}
          {(token || name) && <>{messages.length === 0 && <div className="mt-10 text-center text-sm text-slate-500">اكتب رسالتك وسنرد عليك بأسرع وقت.</div>}{messages.map(m => <div key={m.id} className={`mb-3 flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-6 ${m.senderType === 'user' ? 'rounded-br-md border-sky-300/10 bg-sky-500 text-white' : 'rounded-bl-md border-white/10 bg-slate-800 text-white shadow-sm'}`}>{m.text}</div></div>)}<div ref={bottomRef} /></>}
          {error && <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        </div>
        <div className="border-t border-sky-300/10 bg-slate-950 p-3"><div className="flex gap-2"><input disabled={!token} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={token ? 'اكتب رسالتك...' : 'جارٍ فتح المحادثة...'} className="min-w-0 flex-1 rounded-2xl border border-sky-300/15 bg-slate-900 px-4 py-3 text-sm text-white caret-sky-300 outline-none placeholder:text-slate-500 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60" /><button disabled={!token || !draft.trim() || sending} onClick={sendMessage} className="rounded-2xl bg-sky-500 px-5 font-black text-white shadow-lg shadow-sky-500/15 disabled:opacity-50">{sending ? '...' : 'إرسال'}</button></div></div>
      </div>
    </div>}
  </>;
}
