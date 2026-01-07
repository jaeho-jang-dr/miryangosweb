
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const path = formData.get("path") as string || "uploads"; // Optional path prefix

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            return NextResponse.json({ error: "Storage bucket not configured" }, { status: 500 });
        }

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Construct Firebase Storage API URL
        // Name needs to be URL encoded. We put it in the specified path.
        const fileName = `${path}/${Date.now()}_${file.name}`;
        const encodedName = encodeURIComponent(fileName);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodedName}`;

        // Upload to Firebase Storage via REST API
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${idToken}`,
                "Content-Type": file.type,
            },
            body: buffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Firebase Storage Upload Error:", errorText);
            return NextResponse.json({ error: `Upload failed: ${response.statusText}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Construct Download URL (public token is usually required for implicit access, 
        // but we can generate a simple media link if the bucket rules allow public read)
        // The response `data` contains `downloadTokens` if we want to construct a secure URL,
        // or we can use the `mediaLink` if strictly authenticated? 
        // Usually standard `firebasestorage.googleapis.com/.../o/...alt=media&token=...` is best.

        // However, the Client SDK `getDownloadURL` does a specific call.
        // For simplicity, we'll try to return a constructed URL.
        // Ideally, we return the metadata and let client handle it?
        // Let's return the `alt=media` URL if possible.

        // Actually, `data` has `downloadTokens`. We can construct the proper URL.
        const downloadToken = data.downloadTokens;
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${downloadToken}`;

        return NextResponse.json({ url: downloadUrl });

    } catch (error: any) {
        console.error("Proxy Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
