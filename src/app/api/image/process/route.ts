import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { processImage, getImageInfo } from '@/lib/image-processor';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps } from 'firebase/app';
import { readFile } from 'fs/promises';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
    const apps = getApps();
    if (apps.length > 0) return apps[0];
    return initializeApp(firebaseConfig);
}

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

    console.log('[ImageProcess] Starting image processing...');

    // 임시 디렉토리 생성
    const tempDir = path.join(os.tmpdir(), 'miryang-image-processing');

    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // 원본 파일 임시 저장
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
    const outputPath = path.join(tempDir, outputFilename);

    // 이미지 처리
    await processImage(inputPath, outputPath, {
      width,
      height,
      quality,
      format: outputFormat,
    });

    // 처리된 이미지 정보 가져오기
    const processedImageInfo = await getImageInfo(outputPath);

    // Firebase Storage에 업로드
    const app = getFirebaseApp();
    const storage = getStorage(app);
    
    const processedBuffer = await readFile(outputPath);
    const storageFilename = `images/${Date.now()}-${outputFilename}`;
    const storageRef = ref(storage, storageFilename);

    await uploadBytes(storageRef, processedBuffer, {
      contentType: `image/${outputFormat}`,
      customMetadata: {
        originalName: originalFilename,
        processedAt: new Date().toISOString(),
      }
    });

    const downloadURL = await getDownloadURL(storageRef);

    // 임시 파일 삭제
    try {
      await unlink(inputPath);
      await unlink(outputPath);
    } catch (cleanupError) {
      console.warn('[ImageProcess] Cleanup warning:', cleanupError);
    }

    console.log('[ImageProcess] Success:', downloadURL);

    return NextResponse.json({
      success: true,
      original: {
        filename: originalFilename,
        ...imageInfo,
      },
      processed: {
        filename: outputFilename,
        url: downloadURL,
        ...processedImageInfo,
      },
    });
  } catch (error) {
    console.error('[ImageProcess] Error:', error);
    return NextResponse.json(
      { error: '이미지 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
