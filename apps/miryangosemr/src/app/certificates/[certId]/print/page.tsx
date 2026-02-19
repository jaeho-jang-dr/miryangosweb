'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import EMRLayout from '@/components/layout/EMRLayout';
import { getCertificateById } from '@/lib/certificate-engine';
import { Certificate, CERTIFICATE_TYPE_LABELS } from '@/types/certificates';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';

/** Fully client-side PDF preview — avoids Turbopack SSR issues with @react-pdf/renderer */
const PDFPreview = dynamic(() => import('@/components/certificates/PDFPreview'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function CertificatePrintPage() {
  return <EMRLayout><CertificatePrintContent /></EMRLayout>;
}

function CertificatePrintContent() {
  const params = useParams();
  const certId = params.certId as string;
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCert();
  }, [certId]);

  const loadCert = async () => {
    setLoading(true);
    try {
      const data = await getCertificateById(certId);
      setCert(data);
    } catch (e) {
      console.error('로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cert) {
    return <div className="text-center py-20 text-slate-500">제증명을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/certificates/${certId}`} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            {CERTIFICATE_TYPE_LABELS[cert.type]} 미리보기
          </h1>
          <p className="text-sm text-slate-500">{cert.patientName} | {cert.serialNo}</p>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: '80vh' }}>
        <PDFPreview cert={cert} />
      </div>
    </div>
  );
}
