'use server';

import fs from 'fs';
import path from 'path';

const LOCAL_DIR = path.join(process.cwd(), 'local_images');

export async function getLocalFiles() {
    try {
        if (!fs.existsSync(LOCAL_DIR)) {
            fs.mkdirSync(LOCAL_DIR, { recursive: true });
            return [];
        }
        const files = fs.readdirSync(LOCAL_DIR);
        return files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));
    } catch (error) {
        console.error("Error listing local files:", error);
        return [];
    }
}

export async function readLocalFile(fileName: string) {
    try {
        const filePath = path.join(LOCAL_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            return { error: "File not found" };
        }

        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        const mimeType = getMimeType(fileName);

        return { content: base64, mimeType };

    } catch (error: any) {
        console.error("Error reading local file:", error);
        return { error: error.message };
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
