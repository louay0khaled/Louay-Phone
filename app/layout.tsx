import type { Metadata } from 'next';
import './globals.css';
import LiveChatWidget from '@/components/store/LiveChatWidget';

export const metadata: Metadata = {
  title: 'Louay Phone | هواتف فاخرة',
  description: 'Louay Phone — متجر إلكتروني احترافي للهواتف الذكية.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}<LiveChatWidget /></body></html>;
}
