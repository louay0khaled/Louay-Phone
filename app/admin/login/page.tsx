'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.'); setLoading(false); return; }
    window.location.href = '/admin';
  }

  return <main className="admin-login luxury-grid">
    <form onSubmit={submit} className="glass glow">
      <div className="mb-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200/20 bg-gradient-to-br from-sky-200 to-sky-500 font-extrabold text-slate-950">LP</div><h1 className="text-2xl font-extrabold tracking-tight">دخول الإدارة</h1><p className="mt-2 text-sm text-slate-400">Louay Phone Control Center</p></div>
      <label className="mb-2 block text-sm font-semibold">البريد الإلكتروني</label>
      <input dir="ltr" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mb-5 w-full px-4 py-3 outline-none" placeholder="admin@example.com" />
      <label className="mb-2 block text-sm font-semibold">كلمة المرور</label>
      <input dir="ltr" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mb-5 w-full px-4 py-3 outline-none" />
      {error && <p className="mb-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-300" role="alert">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3.5 disabled:opacity-50">{loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}</button>
    </form>
  </main>;
}
