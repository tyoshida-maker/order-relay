import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// クライアントサイドでauth確認を行うため、middlewareは最小限に
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.png|.*\.csv).*)'],
}
