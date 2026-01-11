"use client";

import axios from 'axios';
import { useState } from 'react';

// NOTE: This is a placeholder for the actual response type.
// We will define this more rigorously later.
type DiseaseInfoResponse = {
  diseaseInfo: {
    knowledge: string;
    treatment: string;
    dosAndDonts: string;
  };
  cartoonImageUrls: string[];
  markdownContent: string;
};

export default function DiseaseCartoonGeneratorPage() {
  const [diseaseName, setDiseaseName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseInfoResponse | null>(null);

  const handleGenerate = async () => {
    if (!diseaseName.trim()) {
      setError('질병 이름을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post<DiseaseInfoResponse>('/api/generate-disease-info', {
        diseaseName,
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError('정보를 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!result || !diseaseName) return;

    const blob = new Blob([result.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize filename
    const sanitizedDiseaseName = diseaseName.replace(/[^a-z0-9_-\u3131-\uD79D]/gi, '_');
    link.download = `${sanitizedDiseaseName}_요약.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToArticles = async () => {
    if (!result || !diseaseName) return;

    if (!confirm('현재 내용을 자료실(Articles)에 등록하시겠습니까?')) return;

    try {
      // Dynamic import to keep page load light
      const { db, auth } = await import("@/lib/firebase-public");
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

      // Check auth
      if (!auth.currentUser) {
        alert("로그인이 필요합니다. 관리자 계정으로 로그인 후 다시 시도해주세요.");
        return;
      }

      // 1. Prepare Content (Markdown + Images from URLs)
      // We append images to the markdown content so they appear inline
      let finalContent = result.markdownContent + "\n\n## 🎨 교육용 웹툰\n\n";
      result.cartoonImageUrls.forEach((url, i) => {
        finalContent += `![웹툰컷 ${i + 1}](${url})\n\n`;
      });

      // 2. Prepare Summary (First 100 chars of knowledge, stripping HTML)
      const summaryText = result.diseaseInfo.knowledge.replace(/<[^>]*>?/gm, '').substring(0, 100) + "...";

      // 3. Save to Firestore 'articles' collection
      await addDoc(collection(db, 'articles'), {
        title: `${diseaseName} 질환 정보 및 웹툰`, // e.g., 고혈압 질환 정보 및 웹툰
        type: 'disease',
        tags: [diseaseName, '건강웹툰', 'AI생성'],
        summary: summaryText,
        content: finalContent,
        images: result.cartoonImageUrls, // Save image URLs array for gallery view if needed
        isVisible: true,
        createdAt: serverTimestamp(),
      });

      alert("✅ 자료실에 성공적으로 등록되었습니다!\n(Admin > 자료실 관리에서 확인 가능)");

    } catch (e: any) {
      console.error("Save Error:", e);
      alert(`저장 중 오류가 발생했습니다: ${e.message}`);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
        질병 정보 및 교육용 웹툰 생성기
      </h1>

      <div className="max-w-xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="예: 고혈압, 당뇨병"
            className="flex-grow p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-blue-600 text-white font-semibold p-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
          >
            {isLoading ? '생성 중...' : '생성하기'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
      </div>

      {isLoading && (
        <div className="text-center my-10">
          <p className="text-xl">AI가 정보를 분석하고 웹툰을 그리고 있습니다...</p>
          <p className="text-gray-500">잠시만 기다려 주세요. (최대 1-2분 소요될 수 있습니다)</p>
        </div>
      )}

      {result && (
        <div className="mt-10 mb-20">
          {/* Section for Disease Information */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4">🩺 질병 정보</h2>
            <div className="prose max-w-none p-6 border rounded-xl bg-white shadow-sm">
              <div dangerouslySetInnerHTML={{ __html: result.diseaseInfo.knowledge }} className="mb-6" />
              <div dangerouslySetInnerHTML={{ __html: result.diseaseInfo.treatment }} className="mb-6" />
              <div dangerouslySetInnerHTML={{ __html: result.diseaseInfo.dosAndDonts }} />
            </div>
          </div>

          {/* Section for Cartoon */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4">🎨 교육용 웹툰</h2>
            <div className="border rounded-xl p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.cartoonImageUrls.map((url, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden shadow-md bg-gray-200">
                      <img src={url} alt={`Cartoon panel ${index + 1}`} className="object-cover w-full h-full" />
                    </div>
                    <span className="mt-2 text-sm text-gray-500 font-medium">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section for Actions */}
          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold mb-4">💾 저장 및 내보내기</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={handleDownloadMarkdown}
                className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <span>📄 마크다운 다운로드</span>
              </button>

              <button
                onClick={handleSaveToArticles}
                className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-transform active:scale-95"
              >
                <span>🚀 자료실로 바로 등록</span>
              </button>
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">
              * '자료실로 바로 등록'을 누르면 텍스트와 웹툰 이미지가 Admin 자료실 게시판으로 자동 전송됩니다.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
