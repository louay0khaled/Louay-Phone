'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { id: string; senderType: string; text: string; createdAt: string };
const TOKEN_KEY = 'louay_phone_chat_token';

export default function ChatWidget() {
  const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [draft, setDraft] = useState(''); const [token, setToken] = useState(''); const [ticketId, setTicketId] = useState(''); const [messages, setMessages] = useState<Message[]>([]); const [loading, setLoading] = useState(false); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh(currentToken = token) { if (!currentToken) return; try { const res = await fetch('/api/chat/messages/get', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken }), cache: 'no-store' }); const data = await res.json(); if (res.ok) { setMessages(data.messages || []); setTicketId(data.ticketId || ''); setName((current) => current || data.visitorName || ''); } } catch {} }
  async function ensureSession(preferredName?: string) { const saved = localStorage.getItem(TOKEN_KEY) || undefined; const res = await fetch('/api/chat/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: saved, name: preferredName?.trim() || name.trim() || undefined }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر فتح المحادثة'); localStorage.setItem(TOKEN_KEY, data.token); setToken(data.token); setTicketId(data.ticketId || ''); if (data.visitorName) setName(data.visitorName); return data.token as string; }
  async function openSession() { setLoading(true); setError(''); try { const currentToken = await ensureSession(); await refresh(currentToken); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر فتح المحادثة'); } finally { setLoading(false); } }
  async function sendMessage() { const text = draft.trim(); if (!text || sending) return; setSending(true); setError(''); try { const currentToken = token || await ensureSession(); const res = await fetch('/api/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: currentToken, text, name: name.trim() || undefined }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || 'تعذر إرسال الرسالة'); setDraft(''); setTicketId(data.ticketId || ticketId); await refresh(currentToken); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إرسال الرسالة'); } finally { setSending(false); } }

  useEffect(() => { const openChat = () => { setOpen(true); void openSession(); }; const onGlobalClick = (event: MouseEvent) => { const target = event.target as HTMLElement | null; if (target?.closest('[data-open-chat]')) openChat(); }; window.addEventListener('louay:open-chat', openChat); document.addEventListener('click', onGlobalClick, true); return () => { window.removeEventListener('louay:open-chat', openChat); document.removeEventListener('click', onGlobalClick, true); }; }, []);
  useEffect(() => { if (open && !token) void openSession(); }, [open]);
  useEffect(() => { if (!open || !token) return; const timer = window.setInterval(() => void refresh(), 5000); return () => window.clearInterval(timer); }, [open, token]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return <>
    <button aria-label="تواصل معنا" onClick={() => setOpen(true)} className="group fixed bottom-5 right-5 z-[70] flex h-16 w-16 items-center justify-center rounded-full border border-sky-200/30 bg-slate-950/80 text-sky-200 shadow-[0_20px_60px_rgba(0,0,0,.35),0_0_40px_rgba(14,165,233,.20)] backdrop-blur-xl transition duration-300 hover:scale-105 hover:border-sky-200/55 hover:bg-sky-400/10">
      <span className="absolute inset-0 rounded-full bg-sky-400/10 opacity-0 blur-xl transition group-hover:opacity-100" />
      <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 11.5a8 8 0 0 1-8.2 8 7.8 7.8 0 0 1-3.6-.9L4 20l1.3-3.2A8 8 0 1 1 20 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round"/></svg>
    </button>

    {open && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-end sm:justify-end sm:p-5" dir="rtl">
      <div className="flex h-[min(740px,100dvh)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-[30px] border border-sky-200/15 bg-slate-950/95 text-white shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:h-[740px] sm:rounded-[30px]">
        <header className="relative overflow-hidden border-b border-sky-300/10 bg-[radial-gradient(circle_at_88%_0%,rgba(56,189,248,.22),transparent_34%),linear-gradient(145deg,#081323,#020617)] px-5 py-5">
          <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative flex items-center justify-between"><div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]"/><h2 className="font-black tracking-tight">تواصل معنا</h2></div><p className="mt-1 text-xs text-slate-400">دعم مباشر من Louay Phone</p></div><button aria-label="إغلاق" onClick={() => setOpen(false)} className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-lg text-slate-300 transition hover:border-sky-300/20 hover:bg-sky-400/10 hover:text-white">×</button></div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,.06),transparent_38%),linear-gradient(180deg,#030914,#020617)] p-4">
          {!token && !name && <div className="mx-auto mt-12 max-w-xs text-center reveal-up"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-sky-300/15 bg-sky-400/10 text-sky-200 shadow-[0_0_50px_rgba(14,165,233,.12)]"><svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20a8 8 0 1 0-8-8"/><path d="M5 19v-3.5A8 8 0 0 1 13 8h6"/><path d="M17 16.5 20 19l-3 2"/></svg></div><h3 className="mt-5 text-2xl font-black tracking-tight">أهلًا وسهلًا</h3><p className="mt-2 text-sm leading-7 text-slate-400">اكتب اسمك لنفتح لك قناة تواصل مباشرة مع فريقنا.</p><input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" className="luxury-input mt-6" /><button onClick={openSession} disabled={loading || name.trim().length < 2} className="luxury-button mt-3 w-full">{loading ? 'جارٍ البدء...' : 'ابدأ المحادثة'}</button></div>}
          {(token || name) && <>{messages.length === 0 && <div className="mx-auto mt-10 max-w-xs text-center text-sm leading-7 text-slate-500">اكتب رسالتك، وسنرد عليك بأسرع وقت.</div>}{messages.map((m) => <div key={m.id} className={`mb-3 flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}`}><div className={`max-w-[84%] whitespace-pre-wrap rounded-[1.15rem] border px-4 py-3 text-sm leading-7 shadow-lg ${m.senderType === 'user' ? 'rounded-br-md border-sky-300/10 bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sky-500/10' : 'rounded-bl-md border-white/10 bg-white/[.045] text-slate-100 shadow-black/10 backdrop-blur-xl'}`}>{m.text}</div></div>)}<div ref={bottomRef} /></>}
          {error && <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm leading-6 text-red-300">{error}</p>}
        </div>

        <div className="border-t border-sky-300/10 bg-slate-950/80 p-3 backdrop-blur-xl"><div className="flex gap-2"><input disabled={!token} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={token ? 'اكتب رسالتك...' : 'جارٍ فتح المحادثة...'} className="luxury-input min-w-0 flex-1 !min-h-[3.25rem] disabled:cursor-not-allowed disabled:opacity-55"/><button disabled={!token || !draft.trim() || sending} onClick={sendMessage} className="luxury-button !min-h-[3.25rem] !px-5">{sending ? '...' : 'إرسال'}</button></div>{ticketId && <p className="mt-2 text-center text-[10px] text-slate-600">المحادثة محفوظة ويمكنك العودة إليها من هذا الجهاز.</p>}</div>
      </div>
    </div>}
  </>;
}
