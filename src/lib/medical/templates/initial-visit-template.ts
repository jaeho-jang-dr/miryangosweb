/**
 * 초진 차트 템플릿
 *
 * 음성 인식으로 자동 작성되는 초진 차트의 구조를 정의합니다.
 */

export interface ChiefComplaint {
    /** 주소 (환자가 말한 주된 증상) */
    complaint: string;
    /** 통증 정도 (0-10) */
    painLevel?: number;
    /** 발생 시기 */
    onset?: string;
}

export interface MedicalHistory {
    /** 언제부터 아팠는가? */
    onsetDate?: string;
    /** 다친 적이 있는가? */
    traumaHistory?: string;
    /** 수술한 적이 있는가? */
    surgeryHistory?: string;
    /** 정확한 아픈 부위 */
    painLocation?: string[];
    /** 변형이나 부종 */
    deformityOrSwelling?: string;
}

export interface OccupationalHistory {
    /** 직업 */
    occupation?: string;
    /** 구체적인 업무 내용 */
    workDetails?: string;
    /** 업무 자세 */
    workPosture?: string;
    /** 하는 운동 */
    exercises?: string[];
}

export interface PhysicalExamination {
    /** 시진 (inspection) */
    inspection?: string;
    /** 촉진 (palpation) */
    palpation?: string;
    /** 가동범위 (ROM) */
    rangeOfMotion?: string;
    /** 특수검사 */
    specialTests?: string[];
}

export interface ImagingPlan {
    /** X-ray 부위 */
    xrayViews?: string[];
    /** 기타 영상 검사 */
    otherImaging?: string[];
    /** 검사 사유 */
    reason?: string;
}

export interface DiagnosisInfo {
    /** 예상 진단명 (ICD-10) */
    suspectedDiagnosis: string[];
    /** 감별 진단 */
    differentialDiagnosis?: string[];
    /** 확진 여부 */
    confirmed: boolean;
}

/**
 * 초진 차트 전체 구조
 */
export interface InitialVisitChart {
    /** 방문 유형 */
    visitType: 'initial';
    /** 환자 ID */
    patientId: string;
    /** 차트 작성 시각 */
    timestamp: Date;

    /** 1. 주소 (Chief Complaint) */
    chiefComplaint: ChiefComplaint;

    /** 2. 병력 (History) */
    history: MedicalHistory;

    /** 3. 직업 및 활동력 */
    occupationalHistory: OccupationalHistory;

    /** 4. 이학적 검사 */
    physicalExam: PhysicalExamination;

    /** 5. 영상 검사 계획 */
    imagingPlan: ImagingPlan;

    /** 6. 예상 진단 */
    diagnosis: DiagnosisInfo;

    /** 원본 대화 기록 (참조용) */
    rawTranscript?: string;
}

/**
 * 초진 차트 기본값
 */
export const createEmptyInitialChart = (patientId: string): InitialVisitChart => ({
    visitType: 'initial',
    patientId,
    timestamp: new Date(),
    chiefComplaint: {
        complaint: '',
    },
    history: {},
    occupationalHistory: {},
    physicalExam: {},
    imagingPlan: {},
    diagnosis: {
        suspectedDiagnosis: [],
        confirmed: false
    }
});

/**
 * 초진 차트를 읽기 쉬운 텍스트로 변환
 */
export function formatInitialChart(chart: InitialVisitChart): string {
    const sections: string[] = [];

    // 1. Chief Complaint
    sections.push('=== 주소 (Chief Complaint) ===');
    sections.push(chart.chiefComplaint.complaint);
    if (chart.chiefComplaint.painLevel) {
        sections.push(`통증 정도: ${chart.chiefComplaint.painLevel}/10`);
    }
    if (chart.chiefComplaint.onset) {
        sections.push(`발생 시기: ${chart.chiefComplaint.onset}`);
    }
    sections.push('');

    // 2. History
    sections.push('=== 병력 (History) ===');
    if (chart.history.onsetDate) {
        sections.push(`• 발병 시기: ${chart.history.onsetDate}`);
    }
    if (chart.history.traumaHistory) {
        sections.push(`• 외상력: ${chart.history.traumaHistory}`);
    }
    if (chart.history.surgeryHistory) {
        sections.push(`• 수술력: ${chart.history.surgeryHistory}`);
    }
    if (chart.history.painLocation?.length) {
        sections.push(`• 통증 부위: ${chart.history.painLocation.join(', ')}`);
    }
    if (chart.history.deformityOrSwelling) {
        sections.push(`• 변형/부종: ${chart.history.deformityOrSwelling}`);
    }
    sections.push('');

    // 3. Occupational History
    sections.push('=== 직업 및 활동력 ===');
    if (chart.occupationalHistory.occupation) {
        sections.push(`• 직업: ${chart.occupationalHistory.occupation}`);
    }
    if (chart.occupationalHistory.workDetails) {
        sections.push(`• 업무 내용: ${chart.occupationalHistory.workDetails}`);
    }
    if (chart.occupationalHistory.workPosture) {
        sections.push(`• 업무 자세: ${chart.occupationalHistory.workPosture}`);
    }
    if (chart.occupationalHistory.exercises?.length) {
        sections.push(`• 운동: ${chart.occupationalHistory.exercises.join(', ')}`);
    }
    sections.push('');

    // 4. Physical Examination
    sections.push('=== 이학적 검사 (Physical Examination) ===');
    if (chart.physicalExam.inspection) {
        sections.push(`• 시진: ${chart.physicalExam.inspection}`);
    }
    if (chart.physicalExam.palpation) {
        sections.push(`• 촉진: ${chart.physicalExam.palpation}`);
    }
    if (chart.physicalExam.rangeOfMotion) {
        sections.push(`• ROM: ${chart.physicalExam.rangeOfMotion}`);
    }
    if (chart.physicalExam.specialTests?.length) {
        sections.push(`• 특수검사: ${chart.physicalExam.specialTests.join(', ')}`);
    }
    sections.push('');

    // 5. Imaging Plan
    sections.push('=== 영상 검사 계획 ===');
    if (chart.imagingPlan.xrayViews?.length) {
        sections.push(`• X-ray: ${chart.imagingPlan.xrayViews.join(', ')}`);
    }
    if (chart.imagingPlan.otherImaging?.length) {
        sections.push(`• 기타: ${chart.imagingPlan.otherImaging.join(', ')}`);
    }
    if (chart.imagingPlan.reason) {
        sections.push(`• 사유: ${chart.imagingPlan.reason}`);
    }
    sections.push('');

    // 6. Diagnosis
    sections.push('=== 진단 (Diagnosis) ===');
    if (chart.diagnosis.suspectedDiagnosis.length) {
        sections.push(`• 예상 진단: ${chart.diagnosis.suspectedDiagnosis.join(', ')}`);
    }
    if (chart.diagnosis.differentialDiagnosis?.length) {
        sections.push(`• 감별 진단: ${chart.diagnosis.differentialDiagnosis.join(', ')}`);
    }
    sections.push(`• 확진 여부: ${chart.diagnosis.confirmed ? '예' : '아니오'}`);

    return sections.join('\n');
}
