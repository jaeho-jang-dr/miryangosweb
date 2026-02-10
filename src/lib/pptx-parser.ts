import JSZip from 'jszip';

/**
 * PPTX 슬라이드 내용
 */
export interface SlideContent {
    slideNumber: number;
    text: string;
}

/**
 * PPTX 파싱 결과
 */
export interface PptxParseResult {
    slides: SlideContent[];
    totalSlides: number;
    totalText: string;
    success: boolean;
    error?: string;
}

/**
 * PPTX 파싱 옵션
 */
export interface PptxParseOptions {
    /** 최대 추출할 슬라이드 수 (기본: 제한 없음) */
    maxSlides?: number;
    /** 최대 텍스트 길이 (기본: 제한 없음) */
    maxTextLength?: number;
    /** 슬라이드 구분자 형식 (기본: '[슬라이드 {num}]') */
    slideFormat?: 'bracket' | 'dash';
}

/**
 * PPTX 파일에서 슬라이드 텍스트 추출
 *
 * @param buffer - PPTX 파일의 Buffer
 * @param options - 파싱 옵션
 * @returns 파싱 결과 (슬라이드 목록, 전체 텍스트 등)
 *
 * @example
 * ```typescript
 * const result = await extractPptxText(buffer);
 * if (result.success) {
 *   console.log(`${result.totalSlides}개 슬라이드에서 ${result.totalText.length}자 추출`);
 * }
 * ```
 */
export async function extractPptxText(
    buffer: Buffer,
    options: PptxParseOptions = {}
): Promise<PptxParseResult> {
    const {
        maxSlides,
        maxTextLength,
        slideFormat = 'bracket'
    } = options;

    try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(buffer);

        // PPTX 슬라이드 XML 파일 찾기 및 정렬
        const slideFiles = Object.keys(contents.files)
            .filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
            .sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
                const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
                return numA - numB;
            });

        // maxSlides 제한 적용
        const slidesToProcess = maxSlides
            ? slideFiles.slice(0, maxSlides)
            : slideFiles;

        const slides: SlideContent[] = [];
        let allText = '';

        for (const slidePath of slidesToProcess) {
            const slideXml = await contents.files[slidePath].async('text');

            // XML에서 <a:t>...</a:t> 태그의 텍스트 추출
            const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);

            if (textMatches && textMatches.length > 0) {
                const slideNum = parseInt(slidePath.match(/slide(\d+)/)?.[1] || '0');
                const slideText = textMatches
                    .map(m => m.replace(/<\/?a:t>/g, ''))
                    .filter(t => t.trim().length > 0) // 빈 텍스트 제거
                    .join(' ');

                if (slideText.trim().length > 0) {
                    slides.push({
                        slideNumber: slideNum,
                        text: slideText
                    });

                    // 슬라이드 형식에 따라 구분자 추가
                    const separator = slideFormat === 'bracket'
                        ? `[슬라이드 ${slideNum}]\n${slideText}\n\n`
                        : `\n--- 슬라이드 ${slideNum} ---\n${slideText}\n`;

                    allText += separator;
                }
            }
        }

        // maxTextLength 제한 적용
        const finalText = maxTextLength
            ? allText.substring(0, maxTextLength)
            : allText;

        return {
            slides,
            totalSlides: slideFiles.length,
            totalText: finalText.trim(),
            success: true
        };

    } catch (error: any) {
        return {
            slides: [],
            totalSlides: 0,
            totalText: '',
            success: false,
            error: error.message || 'PPTX 파싱 실패'
        };
    }
}

/**
 * PPTX 파일 여부 확인
 */
export function isPptxFile(filename: string, mimeType?: string): boolean {
    const isPptxExt = filename.toLowerCase().endsWith('.pptx');
    const isPptxMime = mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    return isPptxExt || isPptxMime;
}
