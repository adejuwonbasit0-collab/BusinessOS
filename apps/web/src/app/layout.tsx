import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { TenantBrandingProvider } from '@/components/providers/TenantBrandingProvider';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'NexOS — Universal Business OS', template: '%s | NexOS' },
  description: 'The all-in-one business operating system for any industry.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `--font-sans` is defined in globals.css as a system font stack.
          Using a local stack instead of a Google-hosted webfont keeps the
          first paint instant and the build working without network access. */}
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" forcedTheme="light" enableColorScheme={false} disableTransitionOnChange>
          <QueryProvider>
            <AuthProvider>
              {/* Applies the workspace's own name, logo, colours and favicon
                  to the browser — a tenant sees its identity, not the
                  platform's. */}
              <TenantBrandingProvider>
                {children}
              </TenantBrandingProvider>
              <ToastProvider />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
