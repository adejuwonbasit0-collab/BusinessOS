'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Skeleton } from '@/components/ui/skeleton';

const AUTH_ROUTES = ['/login', '/register'];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized, initialize, tenant, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // The redirect to the login page must happen exactly once per mount. It used
  // to be derived from `window.location.pathname`, which meant that once the
  // browser had already navigated to `/login`, the next run produced
  // `/login?redirect=/login` — a link to itself. Pushing the URL the browser
  // is already on is a no-op, so the layout never unmounted, the effect kept
  // firing and the app requested `/login?redirect=/login` over and over.
  const redirected = useRef(false);
  // Keep the router out of the effect dependencies: the redirect must not be
  // re-triggered by anything but the auth state itself.
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    // The session (and an admin-console impersonation hand-off) is restored by
    // the store's `initialize()`, which is the single place that knows about
    // the `?impersonation_token=` parameter.
    if (!isInitialized) initialize();
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (!isInitialized || isAuthenticated) return;
    // Never bounce to the login page from the login page.
    if (AUTH_ROUTES.includes(pathname)) return;
    if (redirected.current) return;
    redirected.current = true;
    routerRef.current.push('/login?redirect=' + encodeURIComponent(pathname));
  }, [isAuthenticated, isInitialized, pathname]);

  // A workspace that has not been through the wizard has no modules and no
  // dashboard layout, so it is sent into the wizard instead. Super Admins are
  // exempt: they inspect other tenants' workspaces and must not be pushed
  // into their onboarding.
  const onboardingPending =
    isAuthenticated &&
    tenant?.onboardingCompleted === false &&
    user?.role !== 'super_admin';

  useEffect(() => {
    if (!onboardingPending) return;
    if (pathname === '/onboarding') return;
    routerRef.current.replace('/onboarding');
  }, [onboardingPending, pathname]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-[220px] border-r p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-1">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}</div>
        </div>
        <div className="flex-1 p-6"><Skeleton className="h-64 w-full rounded-xl" /></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-screen-2xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
