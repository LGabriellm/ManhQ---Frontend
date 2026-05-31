import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/activate',
  '/politica-de-privacidade',
  '/termos-de-servico',
  '/subscription/renew',
];

const AUTH_COOKIE = 'manhq_session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip public routes, API proxy, and static assets
  if (
    PUBLIC_ROUTES.includes(pathname) || 
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  // Verifica se o cookie de sessão existe
  // Nota: cf_clearance e __cf_bm são apenas do Cloudflare, o único de auth é o manhq_session
  const session = request.cookies.get(AUTH_COOKIE);
  
  if (!session) {
    // Adiciona o redirect de volta após o login
    const loginUrl = new URL('/auth/login', request.url);
    if (pathname !== '/home') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Executa em todas as rotas exceto arquivos estáticos
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)'],
};
