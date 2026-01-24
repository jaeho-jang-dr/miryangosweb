'use client';

import { useState } from 'react';
import { auth } from "@/lib/firebase-public";
import { getLocalFiles } from "@/actions/local-files";
import { Loader2, X, ImagePlus, AlertCircle } from "lucide-react";
import Image from 'next/image';

interface ImageUploadProps {
    directory: string; // e.g., 'staff' or 'notices'
    currentImageUrl?: string;
    onImageUploaded: (url: string) => void;
    onImageRemoved?: () => void;
    label?: string;
}

export default function ImageUpload({
    directory,
    currentImageUrl,
    onImageUploaded,
    onImageRemoved,
    label = "이미지 업로드"
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImageUrl);
    const [loadError, setLoadError] = useState(false);
    const [activeTab, setActiveTab] = useState<'pc' | 'server'>('pc');
    const [localFiles, setLocalFiles] = useState<string[]>([]);

    // Load local files when identifying server tab
    const loadLocalFiles = async () => {
        try {
            const files = await getLocalFiles();
            setLocalFiles(files);
        } catch (e) {
            console.error(e);
        }
    };

    const uploadFile = async (file: File) => {
        setUploading(true);
        setProgress(0);

        try {
            const user = auth.currentUser;
            const idToken = user ? await user.getIdToken() : undefined;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', `${directory}/${Date.now()}_${file.name}`);

            const headers: HeadersInit = {};
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: headers,
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setProgress(100);
            setLoadError(false);
            setPreviewUrl(data.url);
            onImageUploaded(data.url);
            setUploading(false);

        } catch (error: any) {
            console.error("Upload failed:", error);
            setUploading(false);
            alert(`이미지 업로드 실패: ${error.message}`);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    // Create a more descriptive filename for pasted image
                    const extension = file.type.split('/')[1] || 'png';
                    const pastedFile = new File([file], `pasted_image_${Date.now()}.${extension}`, { type: file.type });
                    await uploadFile(pastedFile);
                    break;
                }
            }
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        // Alt+V shortcut for paste from clipboard
        if (e.altKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            try {
                const clipboardItems = await navigator.clipboard.read();
                for (const item of clipboardItems) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            const extension = type.split('/')[1] || 'png';
                            const file = new File([blob], `pasted_image_${Date.now()}.${extension}`, { type });
                            await uploadFile(file);
                            return;
                        }
                    }
                }
            } catch (error) {
                console.error('Clipboard access failed:', error);
                alert('클립보드 접근에 실패했습니다. 브라우저 권한을 확인해주세요.');
            }
        }
    };

    const handleLocalUpload = async (fileName: string) => {
        if (!confirm(`'${fileName}' 이미지를 업로드 하시겠습니까?`)) return;

        setUploading(true);
        try {
            const user = auth.currentUser;

            // 1. Get file content from server
            const { readLocalFile } = await import("@/actions/local-files");
            const result = await readLocalFile(fileName);

            if (result.error || !result.content || !result.mimeType) {
                throw new Error(result.error || "Failed to read file");
            }

            // 2. Convert base64 to Blob/File
            const byteCharacters = atob(result.content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: result.mimeType });
            const file = new File([blob], fileName, { type: result.mimeType });

            // 3. Upload via API Route
            const idToken = user ? await user.getIdToken() : undefined;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', `${directory}/${Date.now()}_${fileName}`);

            const headers: HeadersInit = {};
            if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: headers,
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            if (!data.success) throw new Error(data.error);

            setPreviewUrl(data.url);
            setLoadError(false);
            onImageUploaded(data.url);
            setUploading(false);
            alert("업로드 성공!");
        } catch (error: any) {
            console.error("Local Upload Error:", error);
            setUploading(false);
            alert(`실패: ${error.message}`);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(undefined);
        setLoadError(false);
        if (onImageRemoved) onImageRemoved();
    };

    return (
        <div className="space-y-4" onPaste={handlePaste} onKeyDown={handleKeyDown} tabIndex={0}>
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
                <div className="flex gap-2 text-xs bg-slate-100 p-1 rounded-md">
                    <button
                        type="button"
                        onClick={() => setActiveTab('pc')}
                        className={`px-3 py-1 rounded ${activeTab === 'pc' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    >
                        내 PC에서 선택
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('server'); loadLocalFiles(); }}
                        className={`px-3 py-1 rounded ${activeTab === 'server' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                    >
                        서버 폴더에서 찾기
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            {previewUrl && !loadError ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50">
                    <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => setLoadError(true)}
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : previewUrl && loadError ? (
                <div className="relative w-32 h-32 rounded-lg border border-red-200 bg-red-50 flex flex-col items-center justify-center text-red-500 gap-1 p-2 text-center">
                    <AlertCircle className="w-6 h-6" />
                    <span className="text-[10px] leading-tight">이미지 로드 실패</span>
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : null}

            {/* Upload Area */}
            {!previewUrl && (
                <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                    {uploading ? (
                        <div className="text-center p-4">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                            <p className="text-sm text-slate-500">업로드 중...</p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'pc' && (
                                <div className="text-center">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100"
                                    />
                                    <p className="mt-2 text-xs text-slate-400">PC에 있는 사진을 선택하거나 <b>Ctrl+V</b> 또는 <b>Alt+V</b>로 붙여넣으세요.</p>
                                </div>
                            )}

                            {activeTab === 'server' && (
                                <div>
                                    <div className="mb-2 text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-200">
                                        📁 <b>local_images</b> 폴더에 있는 파일들입니다.
                                    </div>
                                    {localFiles.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">
                                            서버 폴더(local_images)에 이미지가 없습니다.
                                        </p>
                                    ) : (
                                        <ul className="max-h-40 overflow-y-auto divide-y divide-slate-200">
                                            {localFiles.map(file => (
                                                <li key={file} className="flex items-center justify-between py-2 px-1 hover:bg-slate-100 rounded">
                                                    <span className="text-sm truncate max-w-[70%]">{file}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleLocalUpload(file)}
                                                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                    >
                                                        선택
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
