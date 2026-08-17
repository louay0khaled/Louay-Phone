'use client';

import { usePathname } from 'next/navigation';
import ChatWidget from '@/components/store/ChatWidget';

export default function ChatGate() {
  const pathname = usePathname();
  return pathname === '/' ? null : <ChatWidget />;
}
