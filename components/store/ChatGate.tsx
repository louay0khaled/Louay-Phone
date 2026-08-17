'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const ChatWidget = dynamic(() => import('@/components/store/ChatWidget'), {
  ssr: false,
  loading: () => null,
});

export default function ChatGate() {
  const pathname = usePathname();
  return pathname === '/' ? null : <ChatWidget />;
}
