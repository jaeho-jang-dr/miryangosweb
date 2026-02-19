import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security Headers Middleware
 * CSP는 next.config.ts에서 관리 — 여기서는 추가 보안 헤더만 담당
 *
 * 주의: 이 파일은 proxy.ts이지만 Next.js middleware로 동작하려면
 * src/middleware.ts 파일에서 이 함수를 default export해야 합니다.
 * middleware.ts를 참조하세요.
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

    // X-XSS-Protection은 현대 브라우저에서 deprecated.
    // CSP가 XSS 방어를 담당하며, 이 헤더는 IE/구형 브라우저 호환성만 제공.
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
}

export const config = {
    matcher: [
        // 정적 자산 제외한 모든 경로에 적용
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
