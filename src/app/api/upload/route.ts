import { NextRequest, NextResponse } from "next/server";
import { adminStorage, initAdmin } from "@/lib/firebase-admin";
import { getAuth } from 'firebase-admin/auth';
import path from 'path';

// Force Node.js runtime for robust file handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 허용된 MIME 타입
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
]);

// 최대 파일 크기: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        // 인증 필수
        initAdmin();
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        try {
            await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]);
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid authorization token' }, { status: 401 });
        }

        console.log('[Upload] Starting Firebase Storage upload (Admin SDK)...');

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const clientPath = formData.get("path") as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        // 파일 크기 검증
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({
                success: false,
                error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
            }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ success: false, error: "File is empty" }, { status: 400 });
        }

        // MIME 타입 검증
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json({
                success: false,
                error: `File type '${file.type}' is not allowed`
            }, { status: 400 });
        }

        console.log(`[Upload] Processing: ${file.name} (${file.size} bytes, ${file.type})`);

        // Initialize Admin Storage
        const storage = adminStorage();
        const bucket = storage.bucket();

        // Check if bucket is configured
        if (!bucket.name) {
             throw new Error("Storage bucket not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");
        }

        // 파일 경로 결정 (경로 주입 방지)
        let filename: string;
        if (clientPath) {
            // 경로 정규화 및 디렉토리 트래버설 방지
            const normalizedPath = clientPath.replace(/\.\./g, '').replace(/^\/+/, '');
            // 허용된 prefix만 허용
            const allowedPrefixes = ['uploads/', 'articles/', 'images/'];
            const hasAllowedPrefix = allowedPrefixes.some(prefix => normalizedPath.startsWith(prefix));
            if (!hasAllowedPrefix) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid upload path. Must start with uploads/, articles/, or images/'
                }, { status: 400 });
            }
            filename = normalizedPath;
        } else {
            // 파일 이름에서 위험한 문자 제거
            const safeName = path.basename(file.name).replace(/[^\w.\-]/g, "_");
            filename = `uploads/${Date.now()}-${safeName}`;
        }

        const fileRef = bucket.file(filename);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Firebase Storage
        await fileRef.save(buffer, {
            contentType: file.type,
            metadata: {
                metadata: {
                   originalName: file.name,
                   uploadedAt: new Date().toISOString(),
                }
            }
        });

        // Make the file public
        await fileRef.makePublic();

        // Construct public URL
        const encodedFilename = filename.split('/').map(encodeURIComponent).join('/');
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodedFilename}`;

        console.log(`[Upload] Success: ${publicUrl}`);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: filename,
            type: file.type,
            size: file.size,
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Upload error';
        console.error("[Upload] Firebase Storage Error:", message);
        return NextResponse.json(
            { success: false, error: "Upload failed" },
            { status: 500 }
        );
    }
}
