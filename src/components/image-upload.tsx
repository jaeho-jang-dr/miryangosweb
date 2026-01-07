'use client';

import { useState } from 'react';
import { auth } from "@/lib/firebase-public";
import { uploadImage } from "@/actions/upload";
import { getLocalFiles, uploadLocalFile } from "@/actions/local-files";
import { Loader2, X, ImagePlus } from "lucide-react";
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setProgress(0);

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("로그인이 필요합니다.");
                setUploading(false);
                return;
            }

            // Client-side upload using Firebase SDK
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const { storage } = await import("@/lib/firebase-public");

            const storageRef = ref(storage, `${directory}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);

            setProgress(100);
            setPreviewUrl(url);
            onImageUploaded(url);
            setUploading(false);

        } catch (error: any) {
            console.error("Upload failed:", error);
            setUploading(false);
            alert(`이미지 업로드 실패: ${error.message}`);
        }
    };

    const handleLocalUpload = async (fileName: string) => {
        if (!confirm(`'${fileName}' 이미지를 업로드 하시겠습니까?`)) return;

        setUploading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                alert("로그인이 필요합니다.");
                setUploading(false);
                return;
            }
            const token = await user.getIdToken();

            const result = await uploadLocalFile(fileName, token, directory);
            if (result.error) throw new Error(result.error);

            setPreviewUrl(result.url);
            onImageUploaded(result.url!);
            setUploading(false);
            alert("업로드 성공!");
        } catch (error: any) {
            setUploading(false);
            alert(`실패: ${error.message}`);
        }
    };

    const handleRemove = () => {
        setPreviewUrl(undefined);
        if (onImageRemoved) onImageRemoved();
    };

    return (
        <div className="space-y-4">
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
            {previewUrl && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 group">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

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
                                    <p className="mt-2 text-xs text-slate-400">PC에 있는 사진을 선택하세요.</p>
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
