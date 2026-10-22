'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const AUTH_ROUTES = ['/login', '/register'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized, initialize } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    // There is no session to restore on the login or register pages, and
    // asking for one produced a 401 (plus a refresh attempt) on every visit.
    if (AUTH_ROUTES.includes(pathname)) return;
    if (!isInitialized) initialize();
  }, [isInitialized, initialize, pathname]);

  return <>{children}</>;
}
