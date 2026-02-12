// 의료 기초 데이터 (수가/약품 마스터) 정의

export type InsuranceType = 'care' | 'non_payment' | 'auto_insurance' | 'industrial'; // 급여 | 비급여 | 자보 | 산재
export type MasterCategory = 'consultation' | 'injection' | 'medication_po' | 'procedure_os' | 'physical_therapy' | 'radiology' | 'test_lab' | 'material';

export interface MedicalStandardMaster {
    id: string;             // Firebase Document ID (Auto Generated)

    // --- 식별 정보 ---
    code: string;           // 수가코드 or 약품코드 (EDI Code, e.g., "AA254010" or "645500120")
    oldCode?: string;       // 구 코드 (필요시)

    // --- 명칭 정보 ---
    nameKo: string;         // 한글 명칭 (수가/약품명) - e.g., "타이레놀이알서방정"
    nameEn?: string;        // 영문 명칭 - e.g., "Tylenol ER Tab."
    alias?: string;         // 별칭/검색어 (원내에서 부르는 이름) - e.g., "타이레놀"

    // --- 분류 정보 ---
    category: MasterCategory; // 분류 (진찰료, 주사, 투약, 처치, 물리치료, 영상, 검사, 재료)
    type: 'drug' | 'material' | 'behavior'; // 약품 | 재료 | 행위

    // --- 보험 및 수가 정보 ---
    insuranceType: InsuranceType; // 급여 구분
    priceInsurance: number; // 보험 단가 (수가)
    priceNonInsurance?: number; // 비급여 단가 (일반가) - 비급여 항목일 경우 필수

    // --- 약품 상세 정보 (약품인 경우) ---
    ingredient?: string;    // 성분명
    manufacturer?: string;  // 제약사/제조사
    unit?: string;          // 단위 (Tab, Vial, Amp, ml, g)
    route?: 'PO' | 'IM' | 'IV' | 'SC' | 'TOPICAL'; // 투여 경로

    // --- HIRA 비급여 가격 정보 ---
    hiraAvgAmt?: number;      // HIRA 전국 평균가
    hiraMinAmt?: number;      // HIRA 전국 최저가
    hiraMaxAmt?: number;      // HIRA 전국 최고가
    hiraMdnAmt?: number;      // HIRA 전국 중앙값
    hiraUpdatedAt?: Date;     // HIRA 데이터 조회 시점

    // --- 관리 정보 ---
    isActive: boolean;      // 사용 여부 (삭제 대신 비활성화)
    updatedAt: any;         // 최종 수정일
}

// --- 샘플 데이터 (예시) ---
export const MOCK_MEDICAL_MASTER: MedicalStandardMaster[] = [
    {
        id: 'mock_1',
        code: '648900010',
        nameKo: '록소펜정(록소프로펜나트륨수화물)',
        nameEn: 'Loxofen Tab.',
        alias: '록소펜',
        category: 'medication_po',
        type: 'drug',
        insuranceType: 'care',
        priceInsurance: 125,
        ingredient: 'Loxoprofen Sodium 60mg',
        manufacturer: '동화약품',
        unit: 'Tab',
        route: 'PO',
        isActive: true,
        updatedAt: new Date()
    },
    {
        id: 'mock_2',
        code: 'KK052',
        nameKo: '근육내주사',
        nameEn: 'Intramuscular Injection',
        alias: 'IM',
        category: 'injection',
        type: 'behavior',
        insuranceType: 'care',
        priceInsurance: 1540,
        isActive: true,
        updatedAt: new Date()
    },
    {
        id: 'mock_3',
        code: 'MX123',
        nameKo: '체외충격파치료 [근골격계]',
        nameEn: 'ESWT',
        alias: '충격파',
        category: 'physical_therapy',
        type: 'behavior',
        insuranceType: 'non_payment',
        priceInsurance: 0,
        priceNonInsurance: 50000,
        isActive: true,
        updatedAt: new Date()
    }
];
