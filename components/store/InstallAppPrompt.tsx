'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !promptEvent) return null;

  async function install() {
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // Ignore browser-specific prompt failures.
    } finally {
      setVisible(false);
      setPromptEvent(null);
    }
  }

  return (
    <div dir="rtl" className="fixed inset-x-3 bottom-3 z-[120] mx-auto max-w-xl rounded-2xl border border-sky-200/15 bg-[#07111d]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl supports-[backdrop-filter]:bg-[#07111d]/80">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-200/15 bg-sky-400/10 text-sky-200"><Download size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">ثبّت Louay Phone كتطبيق</p>
          <p className="mt-0.5 text-[11px] text-slate-400">وصول أسرع وتجربة أقرب لتطبيق أندرويد.</p>
        </div>
        <button type="button" onClick={() => setVisible(false)} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white"><X size={17} /></button>
        <button type="button" onClick={() => void install()} className="min-h-10 shrink-0 rounded-xl bg-sky-300 px-4 text-xs font-black text-slate-950 shadow-lg shadow-sky-500/15">تثبيت</button>
      </div>
    </div>
  );
}
