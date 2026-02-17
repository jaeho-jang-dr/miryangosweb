import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

// Force Node.js runtime for robust file handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        console.log('[Upload] Starting Firebase Storage upload (Admin SDK)...');

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const clientPath = formData.get("path") as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
        }

        console.log(`[Upload] Processing: ${file.name} (${file.size} bytes, ${file.type})`);

        // Initialize Admin Storage
        const storage = adminStorage();
        const bucket = storage.bucket();

        // Check if bucket is configured
        if (!bucket.name) {
             throw new Error("Storage bucket not configured. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");
        }

        // Determine filename
        // Priority: Client provided path > Generated filename
        // 보안: 경로 탐색 공격 차단 — 허용된 접두사만 사용
        const ALLOWED_PREFIXES = ['uploads/', 'articles/', 'images/', 'archives/'];
        let filename: string;
        if (clientPath) {
            // 경로 탐색(..), 절대 경로, 비정상 문자 차단
            if (clientPath.includes('..') || clientPath.startsWith('/') || clientPath.startsWith('\\')) {
                return NextResponse.json({ success: false, error: "Invalid file path" }, { status: 400 });
            }
            // 허용된 접두사 확인
            const hasValidPrefix = ALLOWED_PREFIXES.some(prefix => clientPath.startsWith(prefix));
            if (!hasValidPrefix) {
                return NextResponse.json({ success: false, error: "File path must start with an allowed prefix" }, { status: 400 });
            }
            filename = clientPath;
        } else {
            const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
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
        // Format: https://storage.googleapis.com/BUCKET_NAME/FILE_PATH
        // Note: encodeURI needed for filenames with spaces or special chars if not handled by bucket/browser
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        
        console.log(`[Upload] Success: ${publicUrl}`);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: filename,
            type: file.type,
            size: file.size,
        });

    } catch (e: any) {
        console.error("[Upload] Firebase Storage Error:", e);
        return NextResponse.json(
            { success: false, error: e?.message ?? "Upload error" },
            { status: 500 }
        );
    }
}
