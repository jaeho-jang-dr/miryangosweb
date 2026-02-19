'use client';

import React, { useState, useEffect } from 'react';
import { Certificate, CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import { Download } from 'lucide-react';

interface PDFPreviewProps {
  cert: Certificate;
}

/**
 * Client-only PDF viewer/downloader.
 * Uses dynamic import of @react-pdf/renderer to avoid Turbopack SSR issues.
 */
export default function PDFPreview({ cert }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileName = `${CERTIFICATE_TYPE_LABELS[cert.type]}_${cert.patientName}_${cert.serialNo}.pdf`;

  useEffect(() => {
    generatePdf();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [cert]);

  const generatePdf = async () => {
    setGenerating(true);
    setError(null);
    try {
      const [{ pdf }, { CertificatePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/lib/pdf-generator'),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = React.createElement(CertificatePDF, { cert }) as any;
      const blob = await pdf(doc).toBlob();

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (e) {
      console.error('PDF 생성 실패:', e);
      setError('PDF 생성에 실패했습니다. 브라우저 호환성을 확인하세요.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (generating) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">PDF 생성 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={generatePdf} className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end p-3 border-b border-slate-200 bg-slate-50">
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> PDF 다운로드
        </button>
      </div>
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="flex-1 w-full min-h-[600px]"
          title="Certificate PDF Preview"
        />
      )}
    </div>
  );
}
