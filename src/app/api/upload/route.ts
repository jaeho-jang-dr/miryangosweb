import { NextResponse } from "next/server";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps } from "firebase/app";

// Force Node.js runtime for robust file handling
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

export async function POST(req: Request) {
    try {
        console.log('[Upload] Starting Firebase Storage upload...');

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
        }

        console.log(`[Upload] Processing: ${file.name} (${file.size} bytes, ${file.type})`);

        // Initialize Firebase Storage
        const app = getFirebaseApp();
        const storage = getStorage(app);

        // Generate safe filename with timestamp
        const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
        const filename = `uploads/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, filename);

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Firebase Storage
        const snapshot = await uploadBytes(storageRef, buffer, {
            contentType: file.type,
            customMetadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
            }
        });

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log(`[Upload] Success: ${downloadURL}`);

        return NextResponse.json({
            success: true,
            url: downloadURL,
            name: safeName,
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
