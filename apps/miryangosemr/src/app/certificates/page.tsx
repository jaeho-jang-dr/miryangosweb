'use client';

import React, { useState, useEffect } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import {
  getCertificates, getCertificateLabel, voidCertificate,
} from '@/lib/certificate-engine';
import {
  Certificate, CertificateType, CERTIFICATE_TYPE_LABELS,
  COMMON_CERTIFICATE_TYPES,
} from '@/types/certificates';
import {
  FileText, Plus, Search, Filter, Eye, Ban, Printer,
  Calendar, ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

export default function CertificatesPage() {
  return <EMRLayout><CertificatesContent /></EMRLayout>;
}

function CertificatesContent() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<CertificateType | ''>('');
  const [filterStatus, setFilterStatus] = useState<'draft' | 'issued' | 'voided' | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCertificates();
  }, [filterType, filterStatus]);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof getCertificates>[0] = {};
      if (filterType) filters.type = filterType;
      if (filterStatus) filters.status = filterStatus;
      const data = await getCertificates(filters);
      setCertificates(data);
    } catch (e) {
      console.error('제증명 목록 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (certId: string) => {
    const reason = prompt('무효 사유를 입력하세요:');
    if (!reason) return;
    try {
      await voidCertificate(certId, reason);
      await loadCertificates();
    } catch (e) {
      console.error('무효 처리 실패:', e);
    }
  };

  const filtered = certificates.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.patientName.toLowerCase().includes(q) ||
      c.serialNo.toLowerCase().includes(q) ||
      c.diagnosisNames.some(d => d.toLowerCase().includes(q));
  });

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '작성중';
      case 'issued': return '발급';
      case 'voided': return '무효';
      default: return status;
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'warning' as const;
      case 'issued': return 'success' as const;
      case 'voided': return 'danger' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" /> 제증명 관리
          </h1>
          <p className="text-sm text-slate-500">진단서, 소견서, 확인서 등 제증명을 발급하고 관리합니다.</p>
        </div>
      </div>

      {/* Quick Issue Buttons */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4 text-emerald-500" /> 새 제증명 발급
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {COMMON_CERTIFICATE_TYPES.map(type => (
            <Link
              key={type}
              href={`/certificates/new?type=${type}`}
              className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              {CERTIFICATE_TYPE_LABELS[type]}
            </Link>
          ))}
          <Link
            href="/certificates/new"
            className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            기타 제증명...
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="환자명, 발급번호, 진단명 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as CertificateType | '')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="">전체 유형</option>
          {Object.entries(CERTIFICATE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['', 'draft', 'issued', 'voided'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                filterStatus === st
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st === '' ? '전체' : statusLabel(st)}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>발급된 제증명이 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">발급번호</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">유형</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">환자명</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">진단명</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">발급일</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(cert => (
                <tr key={cert.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{cert.serialNo}</td>
                  <td className="px-4 py-3">
                    <Badge variant="purple" className="text-[10px]">
                      {getCertificateLabel(cert.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{cert.patientName}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                    {cert.diagnosisNames[0] || '-'}
                    {cert.diagnosisNames.length > 1 && ` 외 ${cert.diagnosisNames.length - 1}건`}
                  </td>
                  <td className="px-4 py-3 text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />{cert.issueDate}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={statusVariant(cert.status)}>{statusLabel(cert.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/certificates/${cert.id}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {cert.status === 'issued' && (
                        <Link
                          href={`/certificates/${cert.id}/print`}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="인쇄"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                      )}
                      {cert.status !== 'voided' && (
                        <button
                          onClick={() => handleVoid(cert.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="무효 처리"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {!loading && filtered.length > 0 && (
        <div className="text-xs text-slate-400 text-right">
          총 {filtered.length}건 (발급: {filtered.filter(c => c.status === 'issued').length} | 작성중: {filtered.filter(c => c.status === 'draft').length} | 무효: {filtered.filter(c => c.status === 'voided').length})
        </div>
      )}
    </div>
  );
}
