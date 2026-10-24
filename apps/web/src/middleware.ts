import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Super Admin port redirect
  // If user enters http://localhost:3002/admin, redirect directly to admin port :3001
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
    return NextResponse.redirect(new URL(adminUrl));
  }

  // 2. Multi-tenant Subdomain Routing
  // Extracts tenant slug from `subdomain.localhost:3002` or `subdomain.nexos.app`
  const platformDomain = process.env.PLATFORM_DOMAIN || 'localhost:3002';
  const platformHost = platformDomain.split(':')[0].toLowerCase();
  const cleanHost = hostname.split(':')[0]; // strip port
  const isAuthPath = url.pathname === '/login' || url.pathname === '/register' || url.pathname.startsWith('/forgot-password') || url.pathname.startsWith('/reset-password');
  // A tenant's public site lives at its domain root, while its authenticated
  // workspace deliberately keeps the familiar application URLs.  Without
  // this allow-list, `acme.localhost:3002/dashboard` was rewritten to the
  // public site and an owner could never use their own branded dashboard.
  const isTenantAppPath = [
    '/dashboard', '/analytics', '/ai', '/crm', '/sales', '/finance',
    '/accounting', '/erp', '/inventory', '/purchases', '/hr', '/projects',
    '/bookings', '/documents', '/communication', '/automation', '/app-builder',
    '/marketplace', '/integrations', '/white-label', '/website', '/cms',
    '/dev-toolkit', '/branches', '/roles', '/settings', '/themes', '/billing', '/onboarding', '/invoice-templates',
  ].some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));

  // Skip static files, api, _next, and internal paths
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') ||
    url.pathname.startsWith('/site')
  ) {
    return NextResponse.next();
  }

  if (isAuthPath) return NextResponse.next();

  // Check if subdomain exists in hostname
  const hostParts = cleanHost.split('.');
  if (
    (cleanHost.includes('localhost') && hostParts.length > 1 && hostParts[0] !== 'localhost') ||
    (cleanHost.includes('nexos.app') && hostParts.length > 2 && hostParts[0] !== 'app' && hostParts[0] !== 'www')
  ) {
    if (isTenantAppPath) return NextResponse.next();
    const tenantSubdomain = hostParts[0];
    // Rewrite path to /site/[subdomain]
    url.pathname = `/site/${tenantSubdomain}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  const isPlatformHost = cleanHost === platformHost || cleanHost === `www.${platformHost}` || cleanHost === 'localhost';
  if (!isPlatformHost) {
    url.pathname = `/site/${encodeURIComponent(cleanHost)}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
