import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Louay Phone | اختَر هاتفك',
  description: 'هواتف ذكية مختارة بعناية، أسعار واضحة، ومعلومات المنتج ضمن تجربة شراء هادئة وسريعة.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
