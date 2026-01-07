'use server';

export async function uploadFileToServer(formData: FormData, idToken: string) {
    try {
        const file = formData.get('file') as File;
        const path = formData.get('path') as string;
        const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

        if (!file || !path || !bucket) {
            throw new Error('Missing file, path, or bucket configuration');
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const encodedPath = encodeURIComponent(path);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodedPath}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`,
                'Content-Type': file.type,
            },
            body: buffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        // Construct the public download URL
        // Format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[name]?alt=media&token=[downloadToken]
        // Note: The download token is returned in the response as `downloadTokens`
        const downloadToken = data.downloadTokens;

        return {
            success: true,
            url: `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${downloadToken}`
        };

    } catch (error: any) {
        console.error('Server upload error:', error);
        return { success: false, error: error.message };
    }
}
