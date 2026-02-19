'use server';

import fs from 'fs';
import path from 'path';

const LOCAL_DIR = path.join(process.cwd(), 'local_images');

// 허용된 이미지 확장자
const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp)$/i;

export async function getLocalFiles() {
    try {
        if (!fs.existsSync(LOCAL_DIR)) {
            fs.mkdirSync(LOCAL_DIR, { recursive: true });
            return [];
        }
        const files = fs.readdirSync(LOCAL_DIR);
        return files.filter(file => ALLOWED_EXTENSIONS.test(file));
    } catch (error) {
        console.error("Error listing local files:", error);
        return [];
    }
}

export async function readLocalFile(fileName: string) {
    try {
        // 입력 검증: 파일명만 허용 (경로 구분자 차단)
        if (!fileName || typeof fileName !== 'string') {
            return { error: "Invalid file name" };
        }

        // Path traversal 방지: 파일명에서 디렉토리 구분자 제거 후 basename만 사용
        const safeName = path.basename(fileName);

        // 파일명이 변경되었거나 비어있으면 거부
        if (safeName !== fileName || !safeName) {
            return { error: "Invalid file name: path traversal detected" };
        }

        // 허용된 확장자만 허용
        if (!ALLOWED_EXTENSIONS.test(safeName)) {
            return { error: "File type not allowed" };
        }

        // 파일 이름에 null 바이트 차단
        if (fileName.includes('\0')) {
            return { error: "Invalid file name" };
        }

        const filePath = path.join(LOCAL_DIR, safeName);

        // 실제 경로가 LOCAL_DIR 안에 있는지 확인
        const resolvedPath = path.resolve(filePath);
        const resolvedDir = path.resolve(LOCAL_DIR);
        if (!resolvedPath.startsWith(resolvedDir + path.sep) && resolvedPath !== resolvedDir) {
            return { error: "Access denied" };
        }

        if (!fs.existsSync(filePath)) {
            return { error: "File not found" };
        }

        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const mimeType = getMimeType(safeName);

        return { content: base64, mimeType };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error reading local file:", message);
        return { error: "Failed to read file" };
    }
}

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.gif': return 'image/gif';
        case '.webp': return 'image/webp';
        default: return 'application/octet-stream';
    }
}
