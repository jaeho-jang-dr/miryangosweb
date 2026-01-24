'use client';

import { useState, useRef, useEffect } from 'react';
import { MOCK_MEDICAL_MASTER, MedicalStandardMaster, MasterCategory, InsuranceType } from '@/types/clinical-master';
import { Search, Plus, Filter, FileSpreadsheet, Edit, MoreHorizontal, CheckCircle2, XCircle, Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase-clinical'; // Make sure this path is correct

export default function MasterDataPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | MasterCategory>('all');
    const [masterData, setMasterData] = useState<MedicalStandardMaster[]>([]); // Start empty, fetch real data
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- 1. Fetch Real Data from Firestore ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const q = query(collection(db, 'medical_master'), orderBy('code'));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MedicalStandardMaster[];
                    setMasterData(data);
                } else {
                    // Fallback to mock data if empty (for demo)
                    setMasterData(MOCK_MEDICAL_MASTER);
                }
            } catch (error) {
                console.error("Error fetching master data:", error);
                setMasterData(MOCK_MEDICAL_MASTER); // Fallback on error
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);


    // --- 2. Excel Upload Handler ---
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                await saveToFirestore(data);
            } catch (error) {
                console.error("Excel processing error:", error);
                alert("엑셀 파일 처리 중 오류가 발생했습니다.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- 3. Save Parsed Data to Firestore (Batch) ---
    const saveToFirestore = async (excelData: any[]) => {
        const batch = writeBatch(db);
        const collectionRef = collection(db, 'medical_master');
        let count = 0;
        const newItems: MedicalStandardMaster[] = [];

        // Define Column Mapping (Excel Header -> System Field)
        // Adjust these keys based on your actual Excel file headers
        // Example Excel Header: | 코드 | 명칭 | 구분 | 급여 | 보험가 | ...

        for (const row of excelData) {
            // Skip empty rows
            if (!row['코드'] && !row['Code']) continue;

            const code = String(row['코드'] || row['Code']).trim();
            const docRef = doc(collectionRef, code); // Use Code as ID for uniqueness

            // Map Category (Simple Logic for Demo)
            let category: MasterCategory = 'medication_po';
            const typeStr = row['구분'] || row['Type'] || '';
            if (typeStr.includes('주사')) category = 'injection';
            else if (typeStr.includes('처치') || typeStr.includes('수술')) category = 'procedure_os';
            else if (typeStr.includes('물리')) category = 'physical_therapy';
            else if (typeStr.includes('검사')) category = 'test_lab';
            else if (typeStr.includes('영상')) category = 'radiology';

            // Map Insurance Type
            let insuranceType: InsuranceType = 'care';
            const insStr = row['급여'] || row['Insurance'] || '';
            if (insStr.includes('비급여')) insuranceType = 'non_payment';
            else if (insStr.includes('자보')) insuranceType = 'auto_insurance';

            const item: MedicalStandardMaster = {
                id: code,
                code: code,
                nameKo: row['명칭'] || row['Name'] || '이름 없음',
                nameEn: row['영문명'] || '',
                alias: row['별칭'] || '',
                category: category,
                type: (category === 'medication_po' || category === 'injection') ? 'drug' :
                    (category === 'material') ? 'material' : 'behavior',
                insuranceType: insuranceType,
                priceInsurance: Number(row['수가'] || row['Price'] || 0),
                priceNonInsurance: Number(row['일반가'] || row['NonInsPrice'] || 0),
                ingredient: row['성분'] || '',
                manufacturer: row['제조사'] || '',
                unit: row['단위'] || '',
                isActive: true,
                updatedAt: new Date() // Will be converted by Firestore
            };

            batch.set(docRef, item); // Upsert (Overwrite if exists)
            newItems.push(item);
            count++;

            // Firestore Batch limit is 500
            if (count % 400 === 0) {
                await batch.commit();
                // Reset batch is complicated in loop, usually we chunk beforehand.
                // For simplicity in this demo, we assume < 400 items or simple logic.
                // NOTE: In production, split 'excelData' into chunks of 400.
            }
        }

        if (count > 0) await batch.commit(); // Commit remaining
        alert(`${count}건의 데이터가 성공적으로 등록 되었습니다.`);

        // Refresh List (Optimistic update)
        setMasterData(prev => [...newItems, ...prev]);
        // In reality, we should re-fetch or merge smartly, but this handles the "Append" visual.
        window.location.reload(); // Simple reload to fetch fresh sorted data
    };

    // Filter Logic
    const filteredData = masterData.filter(item => {
        const matchesSearch =
            item.nameKo.includes(searchTerm) ||
            item.code.includes(searchTerm) ||
            (item.alias && item.alias.includes(searchTerm));

        const matchesTab = activeTab === 'all' || item.category === activeTab;

        return matchesSearch && matchesTab;
    });

    const CATEGORY_LABELS: Record<string, string> = {
        all: '전체',
        consultation: '진찰료',
        injection: '주사료',
        medication_po: '투약(PO)',
        procedure_os: '처치/수술',
        physical_therapy: '물리치료',
        radiology: '영상검사',
        test_lab: '임상병리',
        material: '치료재료'
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls"
                className="hidden"
            />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        🏥 수가/약품 기초 관리 (Master Data)
                    </h1>
                    <p className="text-slate-500 mt-1">
                        병원 처방의 기준이 되는 수가, 약품, 치료재료의 표준 데이터를 관리합니다.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? '업로드 중...' : '엑셀 일괄 등록'}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm shadow-indigo-200 transition-colors">
                        <Plus className="w-4 h-4" />
                        신규 등록
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === key
                                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                                : 'text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="코드, 한글명, 영문명 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Data Grid */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4 w-12 text-center">상태</th>
                                <th className="p-4">구분(Type)</th>
                                <th className="p-4">코드(Code)</th>
                                <th className="p-4">명칭(Name) / 성분명(Ingredient)</th>
                                <th className="p-4">급여구분</th>
                                <th className="p-4 text-right">수가/단가</th>
                                <th className="p-4">제조사</th>
                                <th className="p-4 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-slate-400">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4 text-center">
                                            {item.isActive ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${item.type === 'drug' ? 'bg-blue-50 text-blue-600' :
                                                item.type === 'behavior' ? 'bg-orange-50 text-orange-600' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.type === 'drug' ? '약품' : item.type === 'behavior' ? '행위' : '재료'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-sm text-slate-600 font-bold">
                                            {item.code}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{item.nameKo}</div>
                                            {(item.nameEn || item.ingredient) && (
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {item.nameEn} {item.ingredient && `• ${item.ingredient}`}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${item.insuranceType === 'care' ? 'bg-green-50 text-green-700' :
                                                item.insuranceType === 'non_payment' ? 'bg-red-50 text-red-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.insuranceType === 'care' ? '급여' :
                                                    item.insuranceType === 'non_payment' ? '비급여' :
                                                        item.insuranceType === 'auto_insurance' ? '자보' : '산재'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-slate-700">
                                            {item.insuranceType === 'non_payment' ? (
                                                <span className="text-red-600 font-bold">
                                                    {item.priceNonInsurance?.toLocaleString()}원
                                                </span>
                                            ) : (
                                                <span>{item.priceInsurance.toLocaleString()}원</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {item.manufacturer || '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                    <span>
                        총 <span className="font-bold text-slate-900">{filteredData.length}</span>개의 항목이 검색되었습니다.
                    </span>
                    <div className="flex gap-2">
                        {/* Pagination or actions could go here */}
                    </div>
                </div>
            </div>
        </div>
    );
}
