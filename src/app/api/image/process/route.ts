import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { processImage, getImageInfo } from '@/lib/image-processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const width = formData.get('width') ? parseInt(formData.get('width') as string) : undefined;
    const height = formData.get('height') ? parseInt(formData.get('height') as string) : undefined;
    const quality = formData.get('quality') ? parseInt(formData.get('quality') as string) : undefined;
    const format = formData.get('format') as string | undefined;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 업로드 디렉토리 생성
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const tempDir = path.join(process.cwd(), 'public', 'temp');

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // 원본 파일 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const originalFilename = file.name;
    const fileExt = path.extname(originalFilename);
    const filename = `${Date.now()}-original${fileExt}`;
    const inputPath = path.join(tempDir, filename);
    await writeFile(inputPath, buffer);

    // 이미지 정보 가져오기
    const imageInfo = await getImageInfo(inputPath);

    // 출력 파일명 생성
    const outputFormat = format || path.extname(originalFilename).slice(1);
    const outputFilename = `${Date.now()}-processed.${outputFormat}`;
    const outputPath = path.join(uploadDir, outputFilename);

    // 이미지 처리
    await processImage(inputPath, outputPath, {
      width,
      height,
      quality,
      format: outputFormat,
    });

    // 처리된 이미지 정보 가져오기
    const processedImageInfo = await getImageInfo(outputPath);

    return NextResponse.json({
      success: true,
      original: {
        filename: originalFilename,
        ...imageInfo,
      },
      processed: {
        filename: outputFilename,
        url: `/uploads/${outputFilename}`,
        ...processedImageInfo,
      },
    });
  } catch (error) {
    console.error('이미지 처리 오류:', error);
    return NextResponse.json(
      { error: '이미지 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
