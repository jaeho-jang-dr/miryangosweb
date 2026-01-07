import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
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

        // public/uploads 아래로 저장 (간단/확실)
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
        const filename = `${Date.now()}-${safeName}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        return NextResponse.json({
            success: true,
            url: `/uploads/${filename}`,
            name: filename,
            type: file.type,
            size: file.size,
        });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e?.message ?? "Upload error" },
            { status: 500 }
        );
    }
}
