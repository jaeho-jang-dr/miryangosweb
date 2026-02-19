'use client';

import React, { useState, useEffect, useMemo } from 'react';
import EMRLayout from '@/components/layout/EMRLayout';
import { Badge } from '@/components/ui/badge';
import { formatKRW } from '@/lib/fee-calculator';
import {
  getCurrentInpatients, getRooms, admitPatient, dischargePatient, calculateLOS,
  addRoom, updateRoom,
} from '@/lib/inpatient-engine';
import {
  Admission, Room, ROOM_TYPE_LABELS, ADMISSION_ROUTE_LABELS,
  ADMISSION_STATUS_LABELS, RoomType, AdmissionRoute,
} from '@/types/inpatient';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  BedDouble, UserPlus, UserMinus, Building, Users,
  Calendar, Search, Plus, X, CheckCircle2, AlertTriangle,
} from 'lucide-react';

export default function InpatientPage() {
  return <EMRLayout><InpatientContent /></EMRLayout>;
}

type TabType = 'census' | 'admit' | 'rooms';

function InpatientContent() {
  const [tab, setTab] = useState<TabType>('census');
  const [inpatients, setInpatients] = useState<Admission[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inp, rms] = await Promise.all([getCurrentInpatients(), getRooms()]);
      setInpatients(inp);
      setRooms(rms);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  };

  // Census summary
  const census = useMemo(() => {
    const totalBeds = rooms.reduce((s, r) => s + r.bedCount, 0);
    const occupiedBeds = rooms.reduce((s, r) => s + r.currentOccupancy, 0);
    return {
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
      totalInpatients: inpatients.length,
    };
  }, [rooms, inpatients]);

  const filtered = inpatients.filter(p => {
    if (!searchQuery) return true;
    return p.patientName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BedDouble className="w-6 h-6 text-indigo-600" /> 입통원 환자관리
        </h1>
        <p className="text-sm text-slate-500">입원/퇴원 관리, 병실 현황, 재원환자 관리</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-400 mb-1">재원환자</p>
          <p className="text-2xl font-bold text-indigo-600">{census.totalInpatients}<span className="text-sm text-slate-400">명</span></p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-400 mb-1">총 병상</p>
          <p className="text-2xl font-bold">{census.totalBeds}<span className="text-sm text-slate-400">개</span></p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-400 mb-1">사용중</p>
          <p className="text-2xl font-bold text-orange-600">{census.occupiedBeds}<span className="text-sm text-slate-400">개</span></p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-400 mb-1">가용</p>
          <p className="text-2xl font-bold text-emerald-600">{census.availableBeds}<span className="text-sm text-slate-400">개</span></p>
        </div>
        <div className={`rounded-xl border p-4 ${census.occupancyRate >= 90 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
          <p className="text-xs text-slate-400 mb-1">점유율</p>
          <p className={`text-2xl font-bold ${census.occupancyRate >= 90 ? 'text-red-600' : 'text-slate-900'}`}>
            {census.occupancyRate}<span className="text-sm text-slate-400">%</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {([
          { key: 'census' as const, label: '재원 현황', icon: Users },
          { key: 'admit' as const, label: '입원 등록', icon: UserPlus },
          { key: 'rooms' as const, label: '병실 관리', icon: Building },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'census' && <CensusTab inpatients={filtered} searchQuery={searchQuery} onSearch={setSearchQuery} onRefresh={loadData} />}
          {tab === 'admit' && <AdmitTab rooms={rooms} onAdmitted={loadData} />}
          {tab === 'rooms' && <RoomsTab rooms={rooms} onRefresh={loadData} />}
        </>
      )}
    </div>
  );
}

/** 재원 현황 탭 */
function CensusTab({ inpatients, searchQuery, onSearch, onRefresh }: {
  inpatients: Admission[]; searchQuery: string; onSearch: (q: string) => void; onRefresh: () => void;
}) {
  const [dischargeTarget, setDischargeTarget] = useState<Admission | null>(null);
  const [discharging, setDischarging] = useState(false);

  const handleDischarge = async () => {
    if (!dischargeTarget) return;
    setDischarging(true);
    try {
      await dischargePatient(dischargeTarget.id, new Date());
      setDischargeTarget(null);
      onRefresh();
    } catch (e) {
      console.error('퇴원 처리 실패:', e);
      alert('퇴원 처리 중 오류가 발생했습니다.');
    } finally {
      setDischarging(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="환자명 검색..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      {/* Inpatient List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {inpatients.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BedDouble className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>재원 환자가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">환자명</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">병실</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">입원일</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">재원일수</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">진단명</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">경로</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">보험</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inpatients.map(p => {
                const los = calculateLOS(p.admissionDate);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{p.patientName}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-700">{p.roomNumber}</span>
                      {p.bedNumber && <span className="text-slate-400 ml-1">({p.bedNumber})</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {p.admissionDate?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={los > 14 ? 'warning' : 'default'} className="text-[10px]">{los}일</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">{p.diagnosis || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="info" className="text-[10px]">{ADMISSION_ROUTE_LABELS[p.admissionRoute]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={p.insuranceType === 'nhis' ? 'info' : 'default'} className="text-[10px]">
                        {p.insuranceType === 'nhis' ? '건보' : p.insuranceType === 'auto' ? '자보' : p.insuranceType === 'industrial' ? '산재' : '일반'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDischargeTarget(p)}
                        className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center gap-1 ml-auto">
                        <UserMinus className="w-3 h-3" /> 퇴원
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Discharge Modal */}
      {dischargeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDischargeTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> 퇴원 처리
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              <strong>{dischargeTarget.patientName}</strong> 환자를 퇴원 처리하시겠습니까?<br />
              병실: {dischargeTarget.roomNumber} | 재원일수: {calculateLOS(dischargeTarget.admissionDate)}일
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDischargeTarget(null)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">취소</button>
              <button onClick={handleDischarge} disabled={discharging}
                className="px-5 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {discharging ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                퇴원 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 입원 등록 탭 */
function AdmitTab({ rooms, onAdmitted }: { rooms: Room[]; onAdmitted: () => void }) {
  const [form, setForm] = useState({
    patientName: '',
    patientId: '',
    diagnosis: '',
    diagnosisCode: '',
    roomId: '',
    admittingDoctorName: '',
    admissionRoute: 'outpatient' as AdmissionRoute,
    insuranceType: 'nhis' as 'nhis' | 'auto' | 'industrial' | 'none',
    memo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [patientResults, setPatientResults] = useState<Array<{ id: string; name: string }>>([]);
  const [searchInput, setSearchInput] = useState('');

  const searchPatients = async (q: string) => {
    setSearchInput(q);
    if (q.length < 2) { setPatientResults([]); return; }
    try {
      const snap = await getDocs(query(collection(db, 'patients'), orderBy('name'), where('name', '>=', q), where('name', '<=', q + '\uf8ff')));
      setPatientResults(snap.docs.map(d => ({ id: d.id, name: (d.data() as { name: string }).name })));
    } catch { setPatientResults([]); }
  };

  const selectPatient = (p: { id: string; name: string }) => {
    setForm(f => ({ ...f, patientId: p.id, patientName: p.name }));
    setSearchInput(p.name);
    setPatientResults([]);
  };

  const selectedRoom = rooms.find(r => r.id === form.roomId);

  const handleSubmit = async () => {
    if (!form.patientName || !form.roomId || !form.admittingDoctorName) {
      alert('환자명, 병실, 담당의를 입력하세요.');
      return;
    }
    setSubmitting(true);
    try {
      await admitPatient({
        patientId: form.patientId || form.patientName,
        patientName: form.patientName,
        diagnosis: form.diagnosis,
        diagnosisCode: form.diagnosisCode,
        roomId: form.roomId,
        roomNumber: selectedRoom?.roomNumber || '',
        roomType: selectedRoom?.roomType || 'general',
        admittingDoctorName: form.admittingDoctorName,
        admissionDate: Timestamp.now(),
        admissionRoute: form.admissionRoute,
        insuranceType: form.insuranceType,
        memo: form.memo,
      });
      alert('입원 등록이 완료되었습니다.');
      onAdmitted();
    } catch (e) {
      console.error('입원 등록 실패:', e);
      alert('입원 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableRooms = rooms.filter(r => r.isActive && r.currentOccupancy < r.bedCount);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-indigo-600" /> 입원 등록
      </h3>

      <div className="space-y-4">
        {/* Patient Search */}
        <div className="relative">
          <label className="block text-xs font-bold text-slate-700 mb-1">환자명 *</label>
          <input value={searchInput} onChange={e => searchPatients(e.target.value)} placeholder="환자명 검색..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          {patientResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 mt-1 max-h-40 overflow-y-auto">
              {patientResults.map(p => (
                <button key={p.id} onClick={() => selectPatient(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">{p.name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">담당의 *</label>
            <input value={form.admittingDoctorName} onChange={e => setForm(f => ({ ...f, admittingDoctorName: e.target.value }))}
              placeholder="담당의 이름" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">입원 경로</label>
            <select value={form.admissionRoute} onChange={e => setForm(f => ({ ...f, admissionRoute: e.target.value as AdmissionRoute }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              {Object.entries(ADMISSION_ROUTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">진단명</label>
          <input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
            placeholder="입원 사유/진단명" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">병실 배정 *</label>
            <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="">선택...</option>
              {availableRooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({ROOM_TYPE_LABELS[r.roomType]}) - {r.bedCount - r.currentOccupancy}자리
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">보험 구분</label>
            <select value={form.insuranceType} onChange={e => setForm(f => ({ ...f, insuranceType: e.target.value as typeof form.insuranceType }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
              <option value="nhis">건강보험</option>
              <option value="auto">자동차보험</option>
              <option value="industrial">산재보험</option>
              <option value="none">일반</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">메모</label>
          <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
            placeholder="특이사항 (알러지, 주의사항 등)" rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none" />
        </div>

        <div className="flex justify-end pt-4">
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 disabled:opacity-50">
            {submitting ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            입원 등록
          </button>
        </div>
      </div>
    </div>
  );
}

/** 병실 관리 탭 */
function RoomsTab({ rooms, onRefresh }: { rooms: Room[]; onRefresh: () => void }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRoom, setNewRoom] = useState({
    roomNumber: '', roomType: 'general' as RoomType, floor: 1,
    bedCount: 1, dailyRate: 0, description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleAddRoom = async () => {
    if (!newRoom.roomNumber) { alert('병실 번호를 입력하세요.'); return; }
    setSaving(true);
    try {
      await addRoom({
        ...newRoom,
        currentOccupancy: 0,
        isActive: true,
      });
      setShowAddForm(false);
      setNewRoom({ roomNumber: '', roomType: 'general', floor: 1, bedCount: 1, dailyRate: 0, description: '' });
      onRefresh();
    } catch (e) {
      console.error('병실 추가 실패:', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleRoomActive = async (room: Room) => {
    try {
      await updateRoom(room.id, { isActive: !room.isActive });
      onRefresh();
    } catch (e) {
      console.error('병실 상태 변경 실패:', e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? '취소' : '병실 추가'}
        </button>
      </div>

      {/* Add Room Form */}
      {showAddForm && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
          <h4 className="font-bold text-indigo-800 mb-3">새 병실 추가</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">병실번호 *</label>
              <input value={newRoom.roomNumber} onChange={e => setNewRoom(r => ({ ...r, roomNumber: e.target.value }))}
                placeholder="101" className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">유형</label>
              <select value={newRoom.roomType} onChange={e => setNewRoom(r => ({ ...r, roomType: e.target.value as RoomType }))}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-white">
                {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">층</label>
              <input type="number" value={newRoom.floor} onChange={e => setNewRoom(r => ({ ...r, floor: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">병상수</label>
              <input type="number" value={newRoom.bedCount} onChange={e => setNewRoom(r => ({ ...r, bedCount: parseInt(e.target.value) || 1 }))}
                min={1} className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">일당 요금</label>
              <input type="number" value={newRoom.dailyRate} onChange={e => setNewRoom(r => ({ ...r, dailyRate: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-600 mb-1">설명</label>
              <input value={newRoom.description} onChange={e => setNewRoom(r => ({ ...r, description: e.target.value }))}
                placeholder="예: 창문있음, 화장실포함" className="w-full px-3 py-2 text-sm border rounded-lg" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAddRoom} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50">
                {saving ? '저장 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => {
          const occupancyPct = room.bedCount > 0 ? Math.round((room.currentOccupancy / room.bedCount) * 100) : 0;
          const available = room.bedCount - room.currentOccupancy;
          return (
            <div key={room.id} className={`rounded-xl border p-4 ${room.isActive ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-slate-900">{room.roomNumber}호</span>
                  <Badge variant={room.roomType === 'vip' ? 'purple' : room.roomType === 'icu' ? 'danger' : 'default'} className="text-[10px]">
                    {ROOM_TYPE_LABELS[room.roomType]}
                  </Badge>
                </div>
                <button onClick={() => toggleRoomActive(room)}
                  className={`text-xs px-2 py-1 rounded ${room.isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}>
                  {room.isActive ? '비활성화' : '활성화'}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${occupancyPct >= 80 ? 'bg-red-500' : occupancyPct >= 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${occupancyPct}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-500">{room.currentOccupancy}/{room.bedCount}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>{room.floor}층</span>
                <span className={available > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                  {available > 0 ? `${available}자리 가용` : '만실'}
                </span>
              </div>
              {room.dailyRate > 0 && (
                <p className="text-xs text-slate-400 mt-1">일당 {formatKRW(room.dailyRate)}</p>
              )}
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Building className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>등록된 병실이 없습니다. 상단의 &quot;병실 추가&quot; 버튼으로 병실을 등록하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
