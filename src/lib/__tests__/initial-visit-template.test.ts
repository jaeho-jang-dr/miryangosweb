import {
  createEmptyInitialChart,
  formatInitialChart,
} from '../medical/templates/initial-visit-template';
import type { InitialVisitChart } from '../medical/templates/initial-visit-template';

describe('medical/templates/initial-visit-template', () => {
  describe('createEmptyInitialChart', () => {
    it('should create a chart with the given patient ID', () => {
      const chart = createEmptyInitialChart('patient-001');
      expect(chart.patientId).toBe('patient-001');
    });

    it('should set visitType to initial', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.visitType).toBe('initial');
    });

    it('should set a timestamp', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.timestamp).toBeInstanceOf(Date);
    });

    it('should have empty chief complaint', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.chiefComplaint.complaint).toBe('');
    });

    it('should have empty history', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.history).toEqual({});
    });

    it('should have empty occupational history', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.occupationalHistory).toEqual({});
    });

    it('should have empty physical exam', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.physicalExam).toEqual({});
    });

    it('should have empty imaging plan', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.imagingPlan).toEqual({});
    });

    it('should have empty diagnosis with confirmed false', () => {
      const chart = createEmptyInitialChart('p1');
      expect(chart.diagnosis.suspectedDiagnosis).toEqual([]);
      expect(chart.diagnosis.confirmed).toBe(false);
    });
  });

  describe('formatInitialChart', () => {
    it('should include Chief Complaint section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = '무릎이 아파요';
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 주소 (Chief Complaint) ===');
      expect(text).toContain('무릎이 아파요');
    });

    it('should include pain level when provided', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = '허리 통증';
      chart.chiefComplaint.painLevel = 7;
      const text = formatInitialChart(chart);
      expect(text).toContain('통증 정도: 7/10');
    });

    it('should include onset when provided', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = '어깨 통증';
      chart.chiefComplaint.onset = '3개월 전';
      const text = formatInitialChart(chart);
      expect(text).toContain('발생 시기: 3개월 전');
    });

    it('should include history section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.history = {
        onsetDate: '2024-10-01',
        traumaHistory: '넘어져서 다침',
        surgeryHistory: '없음',
        painLocation: ['무릎', '발목'],
        deformityOrSwelling: '부종 있음',
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 병력 (History) ===');
      expect(text).toContain('발병 시기: 2024-10-01');
      expect(text).toContain('외상력: 넘어져서 다침');
      expect(text).toContain('수술력: 없음');
      expect(text).toContain('통증 부위: 무릎, 발목');
      expect(text).toContain('변형/부종: 부종 있음');
    });

    it('should include occupational history section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.occupationalHistory = {
        occupation: '농업',
        workDetails: '무거운 짐 옮기기',
        workPosture: '허리 굽힘',
        exercises: ['등산', '수영'],
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 직업 및 활동력 ===');
      expect(text).toContain('직업: 농업');
      expect(text).toContain('업무 내용: 무거운 짐 옮기기');
      expect(text).toContain('업무 자세: 허리 굽힘');
      expect(text).toContain('운동: 등산, 수영');
    });

    it('should include physical examination section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.physicalExam = {
        inspection: '부종 관찰',
        palpation: '압통(+)',
        rangeOfMotion: '굴곡 제한',
        specialTests: ['Neer test (+)', 'Hawkins test (+)'],
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 이학적 검사 (Physical Examination) ===');
      expect(text).toContain('시진: 부종 관찰');
      expect(text).toContain('촉진: 압통(+)');
      expect(text).toContain('ROM: 굴곡 제한');
      expect(text).toContain('특수검사: Neer test (+), Hawkins test (+)');
    });

    it('should include imaging plan section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.imagingPlan = {
        xrayViews: ['Knee AP', 'Knee Lateral'],
        otherImaging: ['MRI'],
        reason: '관절염 평가',
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 영상 검사 계획 ===');
      expect(text).toContain('X-ray: Knee AP, Knee Lateral');
      expect(text).toContain('기타: MRI');
      expect(text).toContain('사유: 관절염 평가');
    });

    it('should include diagnosis section', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.diagnosis = {
        suspectedDiagnosis: ['M17.1 무릎관절증', 'M75.1 회전근개 증후군'],
        differentialDiagnosis: ['M25.5 관절통'],
        confirmed: false,
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 진단 (Diagnosis) ===');
      expect(text).toContain('예상 진단: M17.1 무릎관절증, M75.1 회전근개 증후군');
      expect(text).toContain('감별 진단: M25.5 관절통');
      expect(text).toContain('확진 여부: 아니오');
    });

    it('should show confirmed as 예 when true', () => {
      const chart = createEmptyInitialChart('p1');
      chart.chiefComplaint.complaint = 'test';
      chart.diagnosis = {
        suspectedDiagnosis: ['M17.1'],
        confirmed: true,
      };
      const text = formatInitialChart(chart);
      expect(text).toContain('확진 여부: 예');
    });

    it('should handle chart with all empty optional fields', () => {
      const chart = createEmptyInitialChart('p1');
      const text = formatInitialChart(chart);
      expect(text).toContain('=== 주소 (Chief Complaint) ===');
      expect(text).toContain('=== 병력 (History) ===');
      expect(text).toContain('=== 직업 및 활동력 ===');
      expect(text).toContain('=== 이학적 검사 (Physical Examination) ===');
      expect(text).toContain('=== 영상 검사 계획 ===');
      expect(text).toContain('=== 진단 (Diagnosis) ===');
    });
  });
});
