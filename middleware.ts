import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // Tell the parent admin layout which route is being rendered. This lets
  // /admin/login render without an authenticated session while every other
  // /admin route remains protected by the server layout.
  response.headers.set('x-louay-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
