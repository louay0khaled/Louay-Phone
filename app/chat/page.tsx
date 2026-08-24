'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const TOKEN_KEY = 'louay_phone_web_chat_token';
type Message = { id: string; sender_type: string; message_text: string; created_at: string; is_read?: boolean };
type Conversation = { id: string; ticket_code: string; status: string; visitor_name: string };

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('ar-SY', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function ChatPage() {
  const [token, setToken] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const unread = useMemo(() => messages.filter((m) => m.sender_type !== 'user' && !m.is_read).length, [messages]);

  async function createSession(currentName = name) {
    const response = await fetch('/api/chat/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: currentName.trim() || undefined }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'تعذر بدء المحادثة');
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setConversation(data.conversation);
    setMessages([]);
  }

  async function load() {
    if (!token || document.hidden) return;
    const response = await fetch(`/api/chat/messages?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'تعذر تحميل المحادثة');
    setConversation(data.conversation);
    setMessages(data.messages ?? []);
    setError('');
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const existing = localStorage.getItem(TOKEN_KEY);
        if (existing) setToken(existing);
        else await createSession();
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'تعذر بدء المحادثة');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    const refresh = () => { if (!document.hidden) void load().catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 5000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending || !token) return;
    setSending(true); setError('');
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, message: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال الرسالة');
      setMessages((current) => current.some((item) => item.id === data.message.id) ? current : [...current, data.message]);
      setDraft('');
      window.setTimeout(() => void load(), 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرسالة');
    } finally {
      setSending(false);
    }
  }

  function startFreshChat() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setConversation(null);
    setMessages([]);
    setError('');
    setLoading(true);
    void createSession().then(() => setLoading(false)).catch((err) => {
      setError(err instanceof Error ? err.message : 'تعذر بدء المحادثة');
      setLoading(false);
    });
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-slate-950">
      <div className="container py-8 sm:py-12">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-[0_25px_100px_rgba(15,23,42,.12)]">
          <header className="flex items-center justify-between gap-4 border-b border-black/8 px-5 py-4 sm:px-7">
            <div><p className="text-xs font-extrabold tracking-[.12em] text-sky-600">LOUAY PHONE SUPPORT</p><h1 className="mt-1 text-2xl font-black tracking-tight">المحادثة مع الدعم</h1><p className="mt-1 text-xs text-slate-500">تذكرتك: {conversation?.ticket_code ?? 'جاري التجهيز…'}</p></div>
            <div className="flex items-center gap-2"><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">● متصل</span><button type="button" onClick={startFreshChat} className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-slate-600">محادثة جديدة</button></div>
          </header>

          <div className="min-h-[60vh] bg-[linear-gradient(180deg,#fbfdff,#f4f7fb)] px-4 py-5 sm:px-7">
            {loading ? <div className="grid min-h-[45vh] place-items-center text-sm text-slate-400">جاري تجهيز المحادثة…</div> : messages.length ? <div className="mx-auto max-w-2xl space-y-3">{messages.map((message) => { const mine = message.sender_type === 'user'; return <div key={message.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}><article className={`max-w-[88%] rounded-[1.4rem] px-4 py-3 shadow-sm ${mine ? 'rounded-br-md bg-sky-600 text-white' : 'rounded-bl-md border border-black/6 bg-white text-slate-800'}`}><p className="whitespace-pre-wrap text-sm leading-7">{message.message_text}</p><time className={`mt-1 block text-[10px] ${mine ? 'text-sky-100' : 'text-slate-400'}`}>{timeLabel(message.created_at)}</time></article></div>; })}<div ref={endRef} /></div> : <div className="grid min-h-[45vh] place-items-center"><div className="max-w-md text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-sky-100 text-2xl text-sky-600">✦</div><h2 className="mt-5 text-xl font-black">كيف فينا نساعدك؟</h2><p className="mt-2 text-sm leading-7 text-slate-500">اسأل عن هاتف، سعر، توفر، تقسيط، أو أي استفسار. المحادثة مرتبطة مباشرةً بطلبك.</p></div></div>}
          </div>

          {unread > 0 && <div className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-center text-xs font-bold text-amber-700">لديك {unread} رسالة جديدة من الفريق.</div>}
          <form onSubmit={submit} className="border-t border-black/8 bg-white p-4 sm:p-5">
            {error && <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {!name && !conversation?.visitor_name ? <div className="mb-3 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك (اختياري)" className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400" /><button type="button" onClick={() => void createSession(name)} className="rounded-2xl border border-black/10 px-4 text-xs font-bold">حفظ الاسم</button></div> : null}
            <div className="flex gap-2"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="اكتب رسالتك…" rows={1} className="min-h-12 flex-1 resize-none rounded-[1.25rem] border border-black/10 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /><button disabled={sending || !draft.trim()} className="min-h-12 rounded-[1.25rem] bg-sky-600 px-5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">{sending ? '…' : 'إرسال'}</button></div>
            <p className="mt-2 text-[11px] text-slate-400">Enter للإرسال · Shift + Enter لسطر جديد</p>
          </form>
        </div>
      </div>
    </main>
  );
}
