import JSZip from 'jszip';

/**
 * PPTX 슬라이드 이미지 정보
 */
export interface SlideImage {
    /** 이미지 파일명 (media/image1.png 등) */
    filename: string;
    /** Base64 인코딩된 이미지 데이터 */
    base64: string;
    /** MIME 타입 (image/png, image/jpeg 등) */
    mimeType: string;
}

/**
 * PPTX 슬라이드 내용
 */
export interface SlideContent {
    slideNumber: number;
    text: string;
    /** 슬라이드에 포함된 이미지들 (옵션) */
    images?: SlideImage[];
}

/**
 * PPTX 파싱 결과
 */
export interface PptxParseResult {
    slides: SlideContent[];
    totalSlides: number;
    totalText: string;
    /** 전체 이미지 개수 */
    totalImages?: number;
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
    /** 이미지 추출 여부 (기본: false) */
    includeImages?: boolean;
    /** 최대 이미지 개수 (기본: 슬라이드당 5개) */
    maxImagesPerSlide?: number;
}

/**
 * PPTX 슬라이드에서 이미지 관계 추출
 *
 * @param contents - JSZip contents
 * @param slideNumber - 슬라이드 번호
 * @returns 이미지 ID 목록
 */
async function extractSlideImageIds(
    contents: JSZip,
    slideNumber: number
): Promise<string[]> {
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const relsFile = contents.files[relsPath];

    if (!relsFile) {
        return [];
    }

    const relsXml = await relsFile.async('text');

    // Relationship에서 이미지 참조 찾기
    // <Relationship Id="rId2" Type="..." Target="../media/image1.png"/>
    const imageMatches = relsXml.match(/<Relationship[^>]*Target="[^"]*\/media\/([^"]+)"[^>]*>/g);

    if (!imageMatches) {
        return [];
    }

    const imageFiles: string[] = [];
    for (const match of imageMatches) {
        const targetMatch = match.match(/Target="[^"]*\/media\/([^"]+)"/);
        if (targetMatch && targetMatch[1]) {
            imageFiles.push(`ppt/media/${targetMatch[1]}`);
        }
    }

    return imageFiles;
}

/**
 * 이미지 파일을 Base64로 변환
 *
 * @param contents - JSZip contents
 * @param imagePath - 이미지 파일 경로
 * @returns SlideImage 또는 null
 */
async function convertImageToBase64(
    contents: JSZip,
    imagePath: string
): Promise<SlideImage | null> {
    const imageFile = contents.files[imagePath];

    if (!imageFile) {
        return null;
    }

    try {
        const imageBuffer = await imageFile.async('nodebuffer');
        const base64 = imageBuffer.toString('base64');

        // MIME 타입 추론
        const ext = imagePath.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml',
            'webp': 'image/webp'
        };

        const mimeType = mimeTypes[ext || ''] || 'image/png';
        const filename = imagePath.split('/').pop() || 'image';

        return {
            filename,
            base64,
            mimeType
        };
    } catch (error) {
        console.error(`이미지 변환 실패: ${imagePath}`, error);
        return null;
    }
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
        slideFormat = 'bracket',
        includeImages = false,
        maxImagesPerSlide = 5
    } = options;

    try {
        // 버퍼 검증
        if (!buffer || buffer.length === 0) {
            return {
                slides: [],
                totalSlides: 0,
                totalText: '',
                success: false,
                error: 'PPTX 파일이 비어있습니다'
            };
        }

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

        // 슬라이드가 없는 경우
        if (slideFiles.length === 0) {
            return {
                slides: [],
                totalSlides: 0,
                totalText: '',
                success: false,
                error: 'PPTX 파일에 슬라이드가 없습니다'
            };
        }

        // maxSlides 제한 적용
        const slidesToProcess = maxSlides
            ? slideFiles.slice(0, maxSlides)
            : slideFiles;

        const slides: SlideContent[] = [];
        let allText = '';
        let totalImagesCount = 0;

        for (const slidePath of slidesToProcess) {
            const slideXml = await contents.files[slidePath].async('text');
            const slideNum = parseInt(slidePath.match(/slide(\d+)/)?.[1] || '0');

            // XML에서 <a:t>...</a:t> 태그의 텍스트 추출
            const textMatches = slideXml.match(/<a:t>([^<]*)<\/a:t>/g);

            let slideText = '';
            if (textMatches && textMatches.length > 0) {
                slideText = textMatches
                    .map(m => m.replace(/<\/?a:t>/g, ''))
                    .filter(t => t.trim().length > 0) // 빈 텍스트 제거
                    .join(' ');
            }

            // 이미지 추출 (옵션이 활성화된 경우)
            let slideImages: SlideImage[] | undefined;
            if (includeImages) {
                const imageIds = await extractSlideImageIds(contents, slideNum);
                const imagePromises = imageIds
                    .slice(0, maxImagesPerSlide)
                    .map(imagePath => convertImageToBase64(contents, imagePath));

                const imagesResults = await Promise.all(imagePromises);
                slideImages = imagesResults.filter((img): img is SlideImage => img !== null);
                totalImagesCount += slideImages.length;
            }

            // 텍스트나 이미지가 있는 경우에만 슬라이드 추가
            if (slideText.trim().length > 0 || (slideImages && slideImages.length > 0)) {
                slides.push({
                    slideNumber: slideNum,
                    text: slideText,
                    ...(slideImages && slideImages.length > 0 && { images: slideImages })
                });

                // 텍스트가 있으면 전체 텍스트에 추가
                if (slideText.trim().length > 0) {
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

        // 모든 슬라이드가 비어있는 경우 경고 (단, 이미지가 추출된 경우는 성공으로 처리)
        if (slides.length === 0) {
            return {
                slides,
                totalSlides: slideFiles.length,
                totalText: '',
                totalImages: totalImagesCount,
                success: false,
                error: `${slideFiles.length}개의 슬라이드가 있지만 내용을 추출할 수 없습니다.`
            };
        }

        // 텍스트가 없지만 이미지가 있는 경우
        if (finalText.trim().length === 0 && totalImagesCount > 0) {
            return {
                slides,
                totalSlides: slideFiles.length,
                totalText: '',
                totalImages: totalImagesCount,
                success: true // 이미지가 있으면 성공으로 처리
            };
        }

        // 텍스트와 이미지 모두 없는 경우
        if (finalText.trim().length === 0 && totalImagesCount === 0) {
            return {
                slides,
                totalSlides: slideFiles.length,
                totalText: '',
                totalImages: 0,
                success: false,
                error: `${slideFiles.length}개의 슬라이드가 있지만 텍스트를 추출할 수 없습니다. 이미지 추출을 활성화하려면 includeImages 옵션을 사용하세요.`
            };
        }

        return {
            slides,
            totalSlides: slideFiles.length,
            totalText: finalText.trim(),
            totalImages: includeImages ? totalImagesCount : undefined,
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
