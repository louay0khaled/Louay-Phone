'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    let registration: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((current) => {
        registration = current;
        current.update().catch(() => undefined);
      })
      .catch(() => undefined);

    const onControllerChange = () => window.dispatchEvent(new CustomEvent('louay:sw-ready'));
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      registration = undefined;
    };
  }, []);

  return null;
}
