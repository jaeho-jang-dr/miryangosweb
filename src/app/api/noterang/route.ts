import { NextResponse } from 'next/server';
import { runNoterang } from '@/lib/noterang';
import type { NoterangRequest } from '@/lib/noterang';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/noterang - 슬라이드 생성 요청
 *
 * Body:
 *   title: string (필수)
 *   language?: string (기본: "ko")
 *   style?: "modern" | "minimal" | "corporate" | "creative"
 *   queries?: string[]
 *   sources?: string[]
 *   focus?: string
 *   browser?: boolean
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'title은 필수입니다.' },
        { status: 400 }
      );
    }

    const noterangRequest: NoterangRequest = {
      title: body.title,
      language: body.language || 'ko',
      style: body.style,
      queries: body.queries,
      sources: body.sources,
      focus: body.focus,
      browser: body.browser,
    };

    console.log(`[Noterang API] 요청: "${noterangRequest.title}" (style: ${noterangRequest.style || 'default'})`);

    const result = await runNoterang(noterangRequest);

    console.log(`[Noterang API] 결과: success=${result.success}, slides=${result.slideCount || 0}`);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Noterang API] 오류:', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/noterang - 상태 확인
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    service: 'noterang',
    description: 'NotebookLM Automation API',
    endpoints: {
      POST: {
        description: '슬라이드 생성 요청',
        body: {
          title: 'string (필수)',
          language: 'string (기본: ko)',
          style: 'modern | minimal | corporate | creative',
          queries: 'string[]',
          sources: 'string[]',
          focus: 'string',
          browser: 'boolean',
        },
      },
    },
  });
}
