import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const uploadPath = formData.get("path") as string; // Optional custom path

        if (!file) {
            return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
        }

        // Dynamically import imports to ensure proper execution environment
        const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const { storage } = await import("@/lib/firebase-public");

        const bytes = await file.arrayBuffer();
        const buffer = new Uint8Array(bytes);

        // Determine storage path
        const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
        const filename = `${Date.now()}-${safeName}`;
        // Use provided path if available, or default to uploads/
        const fullPath = uploadPath ? uploadPath : `uploads/${filename}`;

        const storageRef = ref(storage, fullPath);

        // Upload the file
        const snapshot = await uploadBytes(storageRef, buffer, {
            contentType: file.type,
        });

        // Get the download URL
        const url = await getDownloadURL(snapshot.ref);

        return NextResponse.json({
            success: true,
            url: url,
            name: safeName,
            type: file.type,
            size: file.size,
        });
    } catch (e: any) {
        console.error("Server Upload Error:", e);
        return NextResponse.json(
            { success: false, error: e?.message ?? "Upload error" },
            { status: 500 }
        );
    }
}
