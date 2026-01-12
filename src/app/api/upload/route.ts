import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore error if directory already exists
        }

        // Generate safe filename
        const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
        const filename = `${Date.now()}-${safeName}`;
        const filePath = path.join(uploadDir, filename);

        // Write file to public/uploads
        await writeFile(filePath, buffer);

        // Return the public URL
        const url = `/uploads/${filename}`;

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
