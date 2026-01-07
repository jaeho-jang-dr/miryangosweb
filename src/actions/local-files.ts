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

export async function uploadLocalFile(fileName: string, idToken: string, targetPath: string = "uploads") {
    try {
        const filePath = path.join(LOCAL_DIR, fileName);

        if (!fs.existsSync(filePath)) {
            return { error: "File not found" };
        }

        const buffer = fs.readFileSync(filePath);
        const mimeType = getMimeType(fileName);

        if (!idToken) {
            return { error: "Unauthorized" };
        }

        const configuredBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        // Candidate buckets to try in order
        const bucketCandidates = [
            configuredBucket,
            "miryangosweb.appspot.com",
            "miryangosweb.firebasestorage.app",
        ].filter((b, i, self) => b && self.indexOf(b) === i) as string[];

        // Construct unique file name
        const storageName = `${targetPath}/${Date.now()}_${fileName}`;
        const encodedName = encodeURIComponent(storageName);

        let lastError = null;

        for (const bucket of bucketCandidates) {
            console.log(`Trying upload to bucket: ${bucket}`);
            const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedName}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Content-Type": mimeType,
                },
                body: buffer,
            });

            if (response.ok) {
                const data = await response.json();
                const downloadToken = data.downloadTokens;
                const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media&token=${downloadToken}`;
                console.log(`Upload successful to bucket: ${bucket}`);
                return { url: downloadUrl };
            }

            const errorText = await response.text();
            console.error(`Failed bucket ${bucket}:`, response.status, errorText);
            lastError = { status: response.status, text: errorText };

            // If error is NOT 404, it might be permission or other issue, so stop trying?
            // Actually 404 is the main "Bucket Not Found" indicator. 
            // 403 (Permission) means Bucket Exists but auth failed.
            if (response.status !== 404) {
                // return immediate error for permission issues
                return { error: `Upload failed on ${bucket}: ${response.statusText}`, details: errorText };
            }
        }

        return { error: "All bucket candidates failed (404 Not Found). Check project ID or existence.", details: JSON.stringify(lastError) };

    } catch (error: any) {
        console.error("Local File Upload Error:", error);
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
