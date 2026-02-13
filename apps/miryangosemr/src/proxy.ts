import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Proxy
 * CSP는 next.config.ts에서 관리 — 여기서는 추가 보안 헤더만 담당
 */
export function proxy(request: NextRequest) {
    const response = NextResponse.next();

    // HSTS — HTTPS 강제 (1년, 서브도메인 포함)
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    );

    // Clickjacking 방지
    response.headers.set('X-Frame-Options', 'DENY');

    // MIME 타입 스니핑 방지
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Referrer 정책 — 같은 origin만 full URL
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy — 마이크만 self 허용 (음성진료 기능)
    response.headers.set(
        'Permissions-Policy',
        'microphone=(self), camera=(), geolocation=(), payment=()'
    );

    // XSS Protection (레거시 브라우저 지원)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
}

export const config = {
    matcher: [
        // 정적 자산 제외한 모든 경로에 적용
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
