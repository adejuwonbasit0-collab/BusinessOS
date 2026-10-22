import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { AdminQueryProvider } from '@/components/providers/QueryProvider';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'NexOS Super Admin', template: '%s | NexOS Admin' },
  description: 'Platform administration console for NexOS',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `--font-sans` is defined in globals.css as a system font stack. */}
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" forcedTheme="light" enableColorScheme={false} disableTransitionOnChange>
          <AdminQueryProvider>
            <ProtectedLayout>{children}</ProtectedLayout>
          </AdminQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
