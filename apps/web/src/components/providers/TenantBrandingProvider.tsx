'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { brandingApi, NavigationItem, TenantBranding } from '@/lib/brandingApi';
import { useAuthStore } from '@/store/authStore';

/**
 * Applies the workspace's own identity to the browser.
 *
 * A business called "Prosperous Royal Hotel" has to see *its* name, *its*
 * logo and *its* favicon — in the sidebar, in the browser tab and in the
 * address bar — not the platform's generic identity. This provider resolves
 * that identity once per session and keeps it in sync, so no page has to
 * remember to apply it.
 */

interface BrandingContextValue {
  branding: TenantBranding | null;
  navigation: NavigationItem[];
  isLoading: boolean;
  /** Sets the browser tab title for the current page. */
  setPageTitle: (title: string) => void;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: null,
  navigation: [],
  isLoading: false,
  setPageTitle: () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

/**
 * Sets the document title for as long as the calling component is mounted.
 *
 * `useEffect` restores whatever title was there before, so navigating between
 * two pages cannot leave the second page's title behind on the first.
 */
export function usePageTitle(title: string) {
  const { setPageTitle } = useBranding();
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);
}

/**
 * Converts a hex colour into the `H S% L%` triple the theme uses.
 *
 * The stylesheet defines `--primary` as an HSL triple (`hsl(var(--primary))`),
 * so a tenant's brand colour has to be converted before it can be applied.
 */
export function hexToHslTriplet(hex: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!match) return null;

  let value = match[1];
  if (value.length === 3) value = value.split('').map((c) => c + c).join('');

  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyFavicon(href: string | null) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!href) return;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const tenant = useAuthStore((s) => s.tenant);
  const [pageTitle, setPageTitle] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-branding'],
    queryFn: brandingApi.get,
    enabled: isInitialized && isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  const branding: TenantBranding | null = data?.branding ?? null;
  const navigation: NavigationItem[] = useMemo(() => data?.navigation ?? [], [data]);

  // The business name comes from branding when it has loaded, and from the
  // authenticated tenant record before that — so the browser tab never shows
  // the platform's generic name for a logged-in workspace.
  const businessName = branding?.businessName || tenant?.name || 'NexOS';

  // Apply the tenant's colours to the document.
  useEffect(() => {
    if (!branding || typeof document === 'undefined') return;
    const root = document.documentElement;

    const primary = hexToHslTriplet(branding.primaryColor);
    if (primary) {
      root.style.setProperty('--primary', primary);
      root.style.setProperty('--ring', primary);
    }
    const secondary = hexToHslTriplet(branding.secondaryColor);
    if (secondary) root.style.setProperty('--secondary', secondary);

    if (branding.fontFamily) {
      root.style.setProperty('--brand-font', branding.fontFamily);
      root.style.fontFamily = branding.fontFamily;
    }
  }, [branding]);

  // Apply the tenant's favicon.
  useEffect(() => {
    if (!branding) return;
    applyFavicon(branding.faviconUrl);
  }, [branding]);

  // Apply the tenant's name to the browser tab, even before branding loads.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const suffix = pageTitle || 'Dashboard';
    document.title = `${businessName} | ${suffix}`;
  }, [businessName, pageTitle]);

  const setTitle = useCallback((title: string) => setPageTitle(title), []);

  const value = useMemo<BrandingContextValue>(
    () => ({ branding, navigation, isLoading, setPageTitle: setTitle }),
    [branding, navigation, isLoading, setTitle],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}
