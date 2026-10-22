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
  const cleanHost = hostname.split(':')[0]; // strip port

  // Skip static files, api, _next, and internal paths
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.') ||
    url.pathname.startsWith('/site')
  ) {
    return NextResponse.next();
  }

  // Check if subdomain exists in hostname
  const hostParts = cleanHost.split('.');
  if (
    (cleanHost.includes('localhost') && hostParts.length > 1 && hostParts[0] !== 'localhost') ||
    (cleanHost.includes('nexos.app') && hostParts.length > 2 && hostParts[0] !== 'app' && hostParts[0] !== 'www')
  ) {
    const tenantSubdomain = hostParts[0];
    // Rewrite path to /site/[subdomain]
    url.pathname = `/site/${tenantSubdomain}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
