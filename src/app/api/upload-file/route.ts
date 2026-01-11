
import { NextResponse } from 'next/server';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp, getApps } from 'firebase/app';

// 1. Force Node.js runtime (Robust file handling)
export const runtime = 'nodejs';
// 2. Prevent caching
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

export async function POST(request: Request) {
    try {
        console.log(`[ServerUpload] Starting upload request...`);

        // 3. Robust FormData Parsing
        const formData = await request.formData().catch(e => {
            console.error("[ServerUpload] FormData Parse Error:", e);
            throw new Error("Failed to parse file data. File might be too large or corrupted.");
        });

        const file = formData.get('file') as File;

        if (!file) {
            console.error("[ServerUpload] No file found in form data");
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`[ServerUpload] Processing: ${file.name} (${file.size} bytes, ${file.type})`);

        const app = getFirebaseApp();
        const storage = getStorage(app);

        // Sanitize filename
        const saneName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `articles/${Date.now()}_${saneName}`;
        const storageRef = ref(storage, filename);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const snapshot = await uploadBytes(storageRef, buffer, {
            contentType: file.type,
        });

        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`[ServerUpload] Success: ${downloadURL}`);

        return NextResponse.json({ url: downloadURL });

    } catch (error: any) {
        console.error('[ServerUpload] Critical Error:', error);
        return NextResponse.json({ error: `Server Upload Failed: ${error.message}` }, { status: 500 });
    }
}
