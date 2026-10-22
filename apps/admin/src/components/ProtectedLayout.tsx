'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/store/authStore';
import { AdminSidebar } from '@/components/AdminSidebar';

/**
 * Guards the console behind the super-admin session.
 *
 * This used to live in `app/template.tsx`. A template is re-created on every
 * navigation, which tore down the React Query cache each time and made every
 * page change refetch everything. As a layout it is created once, so the
 * cache survives navigation.
 */
export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, initialize } = useAdminAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect at most once. `pathname !== '/login'` already stops the
  // self-referential `/login?redirect=/login` loop; the ref makes sure a
  // re-render cannot start another one.
  const redirected = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (pathname === '/login') return;
    if (!isInitialized) {
      initialize();
      const timer = setTimeout(() => {
        if (!useAdminAuthStore.getState().isInitialized) {
          useAdminAuthStore.setState({ isInitialized: true });
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, initialize, pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated && pathname !== '/login') {
      if (!redirected.current) {
        redirected.current = true;
        routerRef.current.replace('/login');
      }
    }
  }, [isAuthenticated, isInitialized, pathname]);

  if (pathname === '/login') return <>{children}</>;

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Initializing Admin Console...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
