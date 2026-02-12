'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/contexts/admin-auth-context';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Shield, Search, Filter, RefreshCw, ChevronDown, ChevronRight, Clock, User, Database, FileText } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: { _seconds: number; _nanoseconds: number } | string;
  action: string;
  collection: string;
  documentId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  description?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: '생성', color: 'bg-green-100 text-green-700' },
  read: { label: '조회', color: 'bg-blue-100 text-blue-700' },
  update: { label: '수정', color: 'bg-yellow-100 text-yellow-700' },
  delete: { label: '삭제', color: 'bg-red-100 text-red-700' },
  status_change: { label: '상태변경', color: 'bg-purple-100 text-purple-700' },
  encrypt: { label: '암호화', color: 'bg-cyan-100 text-cyan-700' },
  decrypt: { label: '복호화', color: 'bg-orange-100 text-orange-700' },
  sign: { label: '전자서명', color: 'bg-indigo-100 text-indigo-700' },
  export: { label: '내보내기', color: 'bg-slate-100 text-slate-700' },
  login: { label: '로그인', color: 'bg-emerald-100 text-emerald-700' },
  logout: { label: '로그아웃', color: 'bg-gray-100 text-gray-700' },
};

const COLLECTION_LABELS: Record<string, string> = {
  patients: '환자',
  visits: '방문/차트',
  charts: '음성차트',
  appointments: '예약',
  users: '사용자',
};

function formatTimestamp(ts: AuditLogEntry['timestamp']): string {
  if (!ts) return '-';
  let date: Date;
  if (typeof ts === 'string') {
    date = new Date(ts);
  } else if (ts._seconds) {
    date = new Date(ts._seconds * 1000);
  } else {
    return '-';
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogsPage() {
  const { user } = useAdminAuth();
  const { role, isAdmin, isManager } = useAdminRole();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCollection, setFilterCollection] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [limit, setLimit] = useState(50);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filterCollection) params.set('collection', filterCollection);
      if (filterAction) params.set('action', filterAction);
      params.set('limit', String(limit));

      const res = await fetch(`/api/clinical/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  }, [user, filterCollection, filterAction, limit]);

  useEffect(() => {
    if (user && (isAdmin || isManager)) {
      fetchLogs();
    }
  }, [user, isAdmin, isManager, fetchLogs]);

  // Client-side search filter
  const filteredLogs = filterSearch
    ? logs.filter(log =>
        log.documentId?.includes(filterSearch) ||
        log.userEmail?.includes(filterSearch) ||
        log.userName?.includes(filterSearch) ||
        log.description?.includes(filterSearch)
      )
    : logs;

  if (!isAdmin && !isManager) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">관리자 또는 매니저만 접근할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">감사 로그</h1>
            <p className="text-sm text-slate-500">의료법 제23조 — 진료기록 접근/변경 이력</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">필터:</span>
          </div>

          {/* Collection filter */}
          <select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">전체 컬렉션</option>
            {Object.entries(COLLECTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Action filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">전체 액션</option>
            {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="문서ID, 이메일, 설명 검색..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Limit */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value={25}>25건</option>
            <option value={50}>50건</option>
            <option value={100}>100건</option>
            <option value={200}>200건</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">시간</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">액션</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">컬렉션</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">문서 ID</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">사용자</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    로딩 중...
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    감사 로그가 없습니다.
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-700' };
                const isExpanded = expandedId === log.id;

                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3">
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4 text-slate-400" />
                          : <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700">{COLLECTION_LABELS[log.collection] || log.collection}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-[150px] truncate">
                        {log.documentId}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-700 text-xs">
                            {log.userName || log.userEmail || log.userId || '(미인증)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                        {log.description || '-'}
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <h4 className="font-semibold text-slate-700 mb-2">기본 정보</h4>
                              <dl className="space-y-1">
                                <div className="flex gap-2">
                                  <dt className="text-slate-500 w-20">Log ID:</dt>
                                  <dd className="font-mono text-slate-700">{log.id}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-slate-500 w-20">User ID:</dt>
                                  <dd className="font-mono text-slate-700">{log.userId || '-'}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-slate-500 w-20">Email:</dt>
                                  <dd className="text-slate-700">{log.userEmail || '-'}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-slate-500 w-20">역할:</dt>
                                  <dd className="text-slate-700">{log.userRole || '-'}</dd>
                                </div>
                                <div className="flex gap-2">
                                  <dt className="text-slate-500 w-20">IP:</dt>
                                  <dd className="font-mono text-slate-700">{log.ipAddress || '-'}</dd>
                                </div>
                              </dl>
                            </div>

                            {(log.before || log.after) && (
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-2">변경 내용</h4>
                                {log.after && (
                                  <div className="mb-2">
                                    <span className="text-green-600 font-medium">After:</span>
                                    <pre className="mt-1 p-2 bg-white rounded border border-slate-200 overflow-auto max-h-40 text-[11px] text-slate-600">
                                      {JSON.stringify(log.after, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.before && (
                                  <div>
                                    <span className="text-red-600 font-medium">Before:</span>
                                    <pre className="mt-1 p-2 bg-white rounded border border-slate-200 overflow-auto max-h-40 text-[11px] text-slate-600">
                                      {JSON.stringify(log.before, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {log.metadata && (
                              <div className="col-span-2">
                                <h4 className="font-semibold text-slate-700 mb-2">메타데이터</h4>
                                <pre className="p-2 bg-white rounded border border-slate-200 overflow-auto max-h-32 text-[11px] text-slate-600">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filteredLogs.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
            <span>총 {filteredLogs.length}건 표시{filterSearch ? ` (검색 결과)` : ''}</span>
            <span>의료법 제23조에 따라 감사 로그는 삭제할 수 없습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}

