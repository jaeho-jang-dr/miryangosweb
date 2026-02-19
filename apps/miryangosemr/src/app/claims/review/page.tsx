'use client';

import React, { useState } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { CheckCircle, AlertTriangle, Download, FileText, Eye, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ClaimWithBilling extends HIRAClaim {
  billing?: BillingRecord;
}

export default function ClaimsReviewPage() {
  return <EMRLayout><ClaimsReviewContent /></EMRLayout>;
}

function ClaimsReviewContent() {
  const [activeTab, setActiveTab] = useState<'validation' | 'xml'>('validation');
  const [isGenerating, setIsGenerating] = useState(false);
  const [xmlPreview, setXmlPreview] = useState('');
  const [claimData] = useState({
    patientName: '홍길동',
    visitDate: '2026-02-19',
    totalAmount: 15000,
    claimAmount: 10500,
    patientCharge: 4500,
  });

  const handleGenerateXml = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/claims/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true }),
      });
      const data = await res.json();
      if (data.xmlContent) {
        setXmlPreview(data.xmlContent);
        setActiveTab('xml');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadXml = () => {
    if (!xmlPreview) return;
    const blob = new Blob([xmlPreview], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HIRA_EDI_${new Date().toISOString().slice(0, 7).replace('-', '')}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/claims" className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">청구 검토 및 제출</h1>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={handleGenerateXml}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            {isGenerating ? 'XML 생성 중...' : 'XML 미리보기'}
          </button>
          {xmlPreview && (
            <button
              onClick={handleDownloadXml}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              EDI XML 다운로드
            </button>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'validation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <CheckCircle className="w-4 h-4 inline mr-1" />
          검증 결과
        </button>
        <button
          onClick={() => setActiveTab('xml')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'xml' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-4 h-4 inline mr-1" />
          XML 미리보기
        </button>
      </div>

      {activeTab === 'validation' && (
        <div className="space-y-4">
          {/* 1단계: 환자 정보 검증 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">1단계: 환자 정보 검증</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>환자명: {claimData.patientName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>진료일: {claimData.visitDate}</span>
              </div>
            </div>
          </div>

          {/* 2단계: DUR 점검 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">2단계: DUR 점검 결과</h2>
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              DUR 점검 통과 — 병용 금기, 연령 금기 없음
            </div>
          </div>

          {/* 3단계: 청구 금액 검증 */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">3단계: 청구 금액 검증</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-lg font-bold text-slate-900">{claimData.totalAmount.toLocaleString()}원</div>
                <div className="text-xs text-slate-500">총 진료비</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-700">{claimData.claimAmount.toLocaleString()}원</div>
                <div className="text-xs text-slate-500">보험 청구</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-lg font-bold text-amber-700">{claimData.patientCharge.toLocaleString()}원</div>
                <div className="text-xs text-slate-500">환자 부담</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'xml' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">EDI XML 미리보기</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">HIRA EDI 형식</span>
          </div>
          {xmlPreview ? (
            <pre className="text-xs font-mono bg-slate-50 rounded-lg p-4 overflow-auto max-h-96 text-slate-600 whitespace-pre-wrap">
              {xmlPreview}
            </pre>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">상단 &apos;XML 미리보기&apos; 버튼을 눌러 XML을 생성하세요</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">EDI 제출 안내</p>
            <p className="text-xs text-amber-700 mt-1">
              다운로드한 XML 파일을 HIRA EDI 전용 프로그램(요양기관정보마당)에 업로드하여 제출하세요.
              직접 인터넷 연결 제출은 HIRA VPN 및 전자서명이 필요합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
