'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

interface ProcessedImage {
  filename: string;
  url: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

interface ProcessResult {
  success: boolean;
  original: ProcessedImage;
  processed: ProcessedImage;
}

export default function ImageProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 옵션 상태
  const [width, setWidth] = useState<number>(800);
  const [height, setHeight] = useState<number>(600);
  const [quality, setQuality] = useState<number>(80);
  const [format, setFormat] = useState<string>('jpg');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);

      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('width', width.toString());
      formData.append('height', height.toString());
      formData.append('quality', quality.toString());
      formData.append('format', format);

      const response = await fetch('/api/image/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || '이미지 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">이미지 처리기</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 파일 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            이미지 파일 선택
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        </div>

        {/* 미리보기 */}
        {preview && (
          <div>
            <label className="block text-sm font-medium mb-2">원본 미리보기</label>
            <img
              src={preview}
              alt="Preview"
              className="max-w-md rounded-lg shadow-md"
            />
          </div>
        )}

        {/* 옵션 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">너비 (px)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">높이 (px)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              품질 (1-100)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">포맷</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="gif">GIF</option>
            </select>
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={!file || processing}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {processing ? '처리 중...' : '이미지 처리하기'}
        </button>
      </form>

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 결과 */}
      {result && (
        <div className="mt-6 space-y-4">
          <h2 className="text-2xl font-bold">처리 결과</h2>

          <div className="grid grid-cols-2 gap-6">
            {/* 원본 정보 */}
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">원본</h3>
              <p>크기: {result.original.width} x {result.original.height}</p>
              <p>포맷: {result.original.format}</p>
              <p>용량: {(result.original.size / 1024).toFixed(2)} KB</p>
            </div>

            {/* 처리된 이미지 정보 */}
            <div className="p-4 bg-green-100 rounded-lg">
              <h3 className="font-semibold mb-2">처리됨</h3>
              <p>크기: {result.processed.width} x {result.processed.height}</p>
              <p>포맷: {result.processed.format}</p>
              <p>용량: {(result.processed.size / 1024).toFixed(2)} KB</p>
            </div>
          </div>

          {/* 처리된 이미지 */}
          <div>
            <h3 className="font-semibold mb-2">처리된 이미지</h3>
            <img
              src={result.processed.url}
              alt="Processed"
              className="max-w-md rounded-lg shadow-md"
            />
            <a
              href={result.processed.url}
              download={result.processed.filename}
              className="inline-block mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              다운로드
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
