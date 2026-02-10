/**
 * SOAP Note 템플릿 (재진)
 *
 * Subjective - Objective - Assessment - Plan 형식
 */

export interface SubjectiveData {
    /** 주관적 증상 (환자가 말한 내용) */
    symptoms: string[];
    /** 이전 방문 이후 변화 */
    changesSinceLastVisit?: string;
    /** 통증 정도 (0-10) */
    painLevel?: number;
    /** 치료 반응 */
    treatmentResponse?: string;
}

export interface ObjectiveData {
    /** 활력징후 */
    vitalSigns?: {
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
    };
    /** 이학적 검사 소견 */
    physicalFindings: string[];
    /** 영상 소견 */
    imagingFindings?: string[];
    /** 검사 결과 */
    labResults?: string[];
}

export interface AssessmentData {
    /** 진단명 */
    diagnosis: string[];
    /** 진행 상태 */
    progress: 'improving' | 'stable' | 'worsening' | 'resolved';
    /** 임상적 인상 */
    clinicalImpression?: string;
}

export interface PlanData {
    /** 약물 처방 */
    medications?: string[];
    /** 물리치료 */
    physicalTherapy?: string[];
    /** 추가 검사 */
    additionalTests?: string[];
    /** 다음 방문 */
    followUp?: string;
    /** 환자 교육 */
    patientEducation?: string[];
}

/**
 * SOAP Note 전체 구조
 */
export interface SoapNote {
    /** 방문 유형 */
    visitType: 'followup';
    /** 환자 ID */
    patientId: string;
    /** 차트 작성 시각 */
    timestamp: Date;

    /** S: Subjective (주관적 자료) */
    subjective: SubjectiveData;

    /** O: Objective (객관적 자료) */
    objective: ObjectiveData;

    /** A: Assessment (평가) */
    assessment: AssessmentData;

    /** P: Plan (계획) */
    plan: PlanData;

    /** 원본 대화 기록 (참조용) */
    rawTranscript?: string;
}

/**
 * SOAP Note 기본값
 */
export const createEmptySoapNote = (patientId: string): SoapNote => ({
    visitType: 'followup',
    patientId,
    timestamp: new Date(),
    subjective: {
        symptoms: []
    },
    objective: {
        physicalFindings: []
    },
    assessment: {
        diagnosis: [],
        progress: 'stable'
    },
    plan: {}
});

/**
 * SOAP Note를 읽기 쉬운 텍스트로 변환
 */
export function formatSoapNote(soap: SoapNote): string {
    const sections: string[] = [];

    // S: Subjective
    sections.push('=== S (Subjective) ===');
    if (soap.subjective.symptoms.length) {
        sections.push('증상:');
        soap.subjective.symptoms.forEach(s => sections.push(`  - ${s}`));
    }
    if (soap.subjective.changesSinceLastVisit) {
        sections.push(`이전 방문 이후 변화: ${soap.subjective.changesSinceLastVisit}`);
    }
    if (soap.subjective.painLevel !== undefined) {
        sections.push(`통증: ${soap.subjective.painLevel}/10`);
    }
    if (soap.subjective.treatmentResponse) {
        sections.push(`치료 반응: ${soap.subjective.treatmentResponse}`);
    }
    sections.push('');

    // O: Objective
    sections.push('=== O (Objective) ===');
    if (soap.objective.vitalSigns) {
        const vs = soap.objective.vitalSigns;
        if (vs.bloodPressure) sections.push(`BP: ${vs.bloodPressure}`);
        if (vs.heartRate) sections.push(`HR: ${vs.heartRate}`);
        if (vs.temperature) sections.push(`Temp: ${vs.temperature}°C`);
    }
    if (soap.objective.physicalFindings.length) {
        sections.push('이학적 소견:');
        soap.objective.physicalFindings.forEach(f => sections.push(`  - ${f}`));
    }
    if (soap.objective.imagingFindings?.length) {
        sections.push('영상 소견:');
        soap.objective.imagingFindings.forEach(f => sections.push(`  - ${f}`));
    }
    if (soap.objective.labResults?.length) {
        sections.push('검사 결과:');
        soap.objective.labResults.forEach(r => sections.push(`  - ${r}`));
    }
    sections.push('');

    // A: Assessment
    sections.push('=== A (Assessment) ===');
    if (soap.assessment.diagnosis.length) {
        sections.push(`진단: ${soap.assessment.diagnosis.join(', ')}`);
    }
    const progressMap = {
        'improving': '호전',
        'stable': '안정',
        'worsening': '악화',
        'resolved': '완치'
    };
    sections.push(`진행 상태: ${progressMap[soap.assessment.progress]}`);
    if (soap.assessment.clinicalImpression) {
        sections.push(`임상적 인상: ${soap.assessment.clinicalImpression}`);
    }
    sections.push('');

    // P: Plan
    sections.push('=== P (Plan) ===');
    if (soap.plan.medications?.length) {
        sections.push('처방:');
        soap.plan.medications.forEach(m => sections.push(`  - ${m}`));
    }
    if (soap.plan.physicalTherapy?.length) {
        sections.push('물리치료:');
        soap.plan.physicalTherapy.forEach(pt => sections.push(`  - ${pt}`));
    }
    if (soap.plan.additionalTests?.length) {
        sections.push('추가 검사:');
        soap.plan.additionalTests.forEach(t => sections.push(`  - ${t}`));
    }
    if (soap.plan.followUp) {
        sections.push(`다음 방문: ${soap.plan.followUp}`);
    }
    if (soap.plan.patientEducation?.length) {
        sections.push('환자 교육:');
        soap.plan.patientEducation.forEach(e => sections.push(`  - ${e}`));
    }

    return sections.join('\n');
}
