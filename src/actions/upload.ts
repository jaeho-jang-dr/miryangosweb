'use server';

export async function uploadImage(formData: FormData, idToken: string) {
    try {
        const file = formData.get("file") as File;
        const path = formData.get("path") as string || "uploads";

        if (!file) {
            return { error: "No file provided" };
        }

        if (!idToken) {
            return { error: "Unauthorized" };
        }

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            return { error: "Storage bucket not configured" };
        }

        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Construct Firebase Storage API URL
        const fileName = `${path}/${Date.now()}_${file.name}`;
        const encodedName = encodeURIComponent(fileName);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodedName}`;

        // Upload to Firebase Storage via REST API using the ID token
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
            console.error("--- FIREBASE UPLOAD DEBUG START (Direct) ---");
            console.error("Status:", response.status);
            console.error("Status Text:", response.statusText);
            console.error("Target URL:", url);
            console.error("Response Body:", errorText);
            console.error("--- FIREBASE UPLOAD DEBUG END (Direct) ---");
            return { error: `Upload failed: ${response.statusText}`, details: errorText };
        }

        const data = await response.json();

        // Construct Download URL
        const downloadToken = data.downloadTokens;
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${downloadToken}`;

        return { url: downloadUrl };

    } catch (error: any) {
        console.error("Server Action Upload Error:", error);
        return { error: error.message };
    }
}
