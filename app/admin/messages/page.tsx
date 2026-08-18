import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: conversations, error } = await db
    .from('conversations')
    .select('id,ticket_code,customer_id,telegram_chat_id,visitor_name,status,last_message_at,created_at')
    .order('last_message_at', { ascending: false })
    .limit(100);

  if (error) return <section className="p-5 lg:p-10"><div className="mx-auto max-w-6xl lp-surface rounded-3xl p-7"><p className="text-xs font-black tracking-[.18em] text-red-300">MESSAGE CONTROL ERROR</p><h1 className="mt-2 text-2xl font-black">تعذر تحميل المحادثات</h1><p className="mt-3 text-sm leading-7 text-slate-400">تحقق من اتصال Supabase وصلاحيات جدول conversations.</p></div></section>;

  const customerIds = [...new Set((conversations ?? []).map((c: any) => c.customer_id).filter(Boolean))] as string[];
  const conversationIds = (conversations ?? []).map((c: any) => c.id);
  const [{ data: customers }, { data: messages }] = await Promise.all([
    customerIds.length ? db.from('customers').select('id,name,phone,telegram_username').in('id', customerIds) : Promise.resolve({ data: [] as any[] }),
    conversationIds.length ? db.from('messages').select('id,conversation_id,sender_type,message_text,created_at,is_read').in('conversation_id', conversationIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] as any[] }),
  ]);

  const customerMap = new Map((customers ?? []).map((c: any) => [c.id, c]));
  const latestMessageMap = new Map<string, any>();
  for (const message of messages ?? []) if (!latestMessageMap.has(message.conversation_id)) latestMessageMap.set(message.conversation_id, message);
  const openCount = (conversations ?? []).filter((c: any) => c.status === 'open').length;
  const processingCount = (conversations ?? []).filter((c: any) => c.status === 'processing').length;
  const telegramCount = (conversations ?? []).filter((c: any) => c.telegram_chat_id).length;

  return <section className="p-5 lg:p-10"><div className="mx-auto max-w-6xl">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black tracking-[.18em] text-sky-300">MESSAGE CONTROL</p><h1 className="mt-2 text-3xl font-black">المحادثات</h1><p className="mt-2 text-sm leading-7 text-slate-400">استعراض محادثات الموقع وTelegram مع آخر رسالة ومعلومات الزبون.</p></div><Link href="/admin" className="luxury-button-secondary w-fit">← لوحة التحكم</Link></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">كل المحادثات</p><b className="mt-1 block text-2xl">{conversations?.length ?? 0}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">مفتوحة</p><b className="mt-1 block text-2xl text-sky-300">{openCount}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">قيد المعالجة</p><b className="mt-1 block text-2xl text-amber-300">{processingCount}</b></div><div className="lp-surface rounded-2xl p-4"><p className="text-xs text-slate-500">Telegram</p><b className="mt-1 block text-2xl text-cyan-300">{telegramCount}</b></div></div>
    {(conversations ?? []).length === 0 ? <div className="lp-surface mt-5 rounded-3xl p-12 text-center"><div className="text-4xl">💬</div><h2 className="mt-4 text-xl font-black">لا توجد محادثات بعد</h2><p className="mt-2 text-sm text-slate-500">ستظهر محادثات الزبائن هنا بعد بدء التواصل.</p></div> : <div className="mt-5 grid gap-4">{(conversations ?? []).map((conversation: any) => { const customer = customerMap.get(conversation.customer_id) as any; const latest = latestMessageMap.get(conversation.id) as any; const website = !conversation.telegram_chat_id; const name = conversation.visitor_name || customer?.name || (website ? 'زائر الموقع' : 'زبون Telegram'); const statusLabel = conversation.status === 'open' ? 'مفتوحة' : conversation.status === 'processing' ? 'قيد المعالجة' : 'مغلقة'; return <article key={conversation.id} className="lp-surface rounded-3xl p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-black">{name}</h2><p className="mt-1 text-xs text-slate-500">التذكرة: <code className="text-sky-300">{conversation.ticket_code || conversation.id}</code></p></div><div className="flex flex-wrap gap-2"><span className="luxury-badge">{statusLabel}</span><span className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-xs font-bold text-slate-300">{website ? 'الموقع' : 'Telegram'}</span></div></div><div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">{!website && <p>Telegram: {customer?.telegram_username ? `@${customer.telegram_username}` : '—'}</p>}<p>الهاتف: {customer?.phone || 'غير مضاف'}</p><p className="sm:col-span-2">آخر رسالة: {latest?.message_text || 'لا توجد رسائل نصية'}</p></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleString('ar-SY') : '—'}</span>{!website && <span>Chat ID: {conversation.telegram_chat_id}</span>}</div></article>; })}</div>}
  </div></section>;
}
