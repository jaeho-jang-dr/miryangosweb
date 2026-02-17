import {
  createEmptySoapNote,
  formatSoapNote,
} from '../medical/templates/soap-note-template';
import type { SoapNote } from '../medical/templates/soap-note-template';

describe('medical/templates/soap-note-template', () => {
  describe('createEmptySoapNote', () => {
    it('should create a note with the given patient ID', () => {
      const note = createEmptySoapNote('patient-001');
      expect(note.patientId).toBe('patient-001');
    });

    it('should set visitType to followup', () => {
      const note = createEmptySoapNote('p1');
      expect(note.visitType).toBe('followup');
    });

    it('should set a timestamp', () => {
      const note = createEmptySoapNote('p1');
      expect(note.timestamp).toBeInstanceOf(Date);
    });

    it('should have empty symptoms array', () => {
      const note = createEmptySoapNote('p1');
      expect(note.subjective.symptoms).toEqual([]);
    });

    it('should have empty physical findings', () => {
      const note = createEmptySoapNote('p1');
      expect(note.objective.physicalFindings).toEqual([]);
    });

    it('should have empty diagnosis array', () => {
      const note = createEmptySoapNote('p1');
      expect(note.assessment.diagnosis).toEqual([]);
    });

    it('should default progress to stable', () => {
      const note = createEmptySoapNote('p1');
      expect(note.assessment.progress).toBe('stable');
    });

    it('should have empty plan', () => {
      const note = createEmptySoapNote('p1');
      expect(note.plan).toEqual({});
    });
  });

  describe('formatSoapNote', () => {
    it('should include all four SOAP sections', () => {
      const note = createEmptySoapNote('p1');
      const text = formatSoapNote(note);
      expect(text).toContain('=== S (Subjective) ===');
      expect(text).toContain('=== O (Objective) ===');
      expect(text).toContain('=== A (Assessment) ===');
      expect(text).toContain('=== P (Plan) ===');
    });

    it('should format subjective symptoms', () => {
      const note = createEmptySoapNote('p1');
      note.subjective.symptoms = ['무릎 통증', '계단 내려갈 때 악화'];
      const text = formatSoapNote(note);
      expect(text).toContain('증상:');
      expect(text).toContain('  - 무릎 통증');
      expect(text).toContain('  - 계단 내려갈 때 악화');
    });

    it('should format changes since last visit', () => {
      const note = createEmptySoapNote('p1');
      note.subjective.changesSinceLastVisit = '약간 호전됨';
      const text = formatSoapNote(note);
      expect(text).toContain('이전 방문 이후 변화: 약간 호전됨');
    });

    it('should format pain level', () => {
      const note = createEmptySoapNote('p1');
      note.subjective.painLevel = 5;
      const text = formatSoapNote(note);
      expect(text).toContain('통증: 5/10');
    });

    it('should format treatment response', () => {
      const note = createEmptySoapNote('p1');
      note.subjective.treatmentResponse = '약 먹고 좋아졌어요';
      const text = formatSoapNote(note);
      expect(text).toContain('치료 반응: 약 먹고 좋아졌어요');
    });

    it('should format vital signs', () => {
      const note = createEmptySoapNote('p1');
      note.objective.vitalSigns = {
        bloodPressure: '120/80',
        heartRate: 72,
        temperature: 36.5,
      };
      const text = formatSoapNote(note);
      expect(text).toContain('BP: 120/80');
      expect(text).toContain('HR: 72');
      expect(text).toContain('Temp: 36.5');
    });

    it('should format physical findings', () => {
      const note = createEmptySoapNote('p1');
      note.objective.physicalFindings = ['압통(+)', '부종(-)'];
      const text = formatSoapNote(note);
      expect(text).toContain('이학적 소견:');
      expect(text).toContain('  - 압통(+)');
      expect(text).toContain('  - 부종(-)');
    });

    it('should format imaging findings', () => {
      const note = createEmptySoapNote('p1');
      note.objective.imagingFindings = ['OA grade 2'];
      const text = formatSoapNote(note);
      expect(text).toContain('영상 소견:');
      expect(text).toContain('  - OA grade 2');
    });

    it('should format lab results', () => {
      const note = createEmptySoapNote('p1');
      note.objective.labResults = ['CRP 0.5'];
      const text = formatSoapNote(note);
      expect(text).toContain('검사 결과:');
      expect(text).toContain('  - CRP 0.5');
    });

    it('should format assessment diagnosis', () => {
      const note = createEmptySoapNote('p1');
      note.assessment.diagnosis = ['M17.1 무릎관절증', 'M75.1 회전근개'];
      const text = formatSoapNote(note);
      expect(text).toContain('진단: M17.1 무릎관절증, M75.1 회전근개');
    });

    it('should map progress states to Korean', () => {
      const progressMap: Record<string, string> = {
        improving: '호전',
        stable: '안정',
        worsening: '악화',
        resolved: '완치',
      };

      for (const [progress, korean] of Object.entries(progressMap)) {
        const note = createEmptySoapNote('p1');
        note.assessment.progress = progress as SoapNote['assessment']['progress'];
        const text = formatSoapNote(note);
        expect(text).toContain(`진행 상태: ${korean}`);
      }
    });

    it('should format clinical impression', () => {
      const note = createEmptySoapNote('p1');
      note.assessment.clinicalImpression = '관절염 악화 소견';
      const text = formatSoapNote(note);
      expect(text).toContain('임상적 인상: 관절염 악화 소견');
    });

    it('should format medications in plan', () => {
      const note = createEmptySoapNote('p1');
      note.plan.medications = ['세레콕시브 200mg', '아세트아미노펜 500mg'];
      const text = formatSoapNote(note);
      expect(text).toContain('처방:');
      expect(text).toContain('  - 세레콕시브 200mg');
      expect(text).toContain('  - 아세트아미노펜 500mg');
    });

    it('should format physical therapy in plan', () => {
      const note = createEmptySoapNote('p1');
      note.plan.physicalTherapy = ['도수치료', 'ICT'];
      const text = formatSoapNote(note);
      expect(text).toContain('물리치료:');
      expect(text).toContain('  - 도수치료');
    });

    it('should format additional tests in plan', () => {
      const note = createEmptySoapNote('p1');
      note.plan.additionalTests = ['MRI 촬영'];
      const text = formatSoapNote(note);
      expect(text).toContain('추가 검사:');
      expect(text).toContain('  - MRI 촬영');
    });

    it('should format follow-up in plan', () => {
      const note = createEmptySoapNote('p1');
      note.plan.followUp = '2주 후 재방문';
      const text = formatSoapNote(note);
      expect(text).toContain('다음 방문: 2주 후 재방문');
    });

    it('should format patient education in plan', () => {
      const note = createEmptySoapNote('p1');
      note.plan.patientEducation = ['무릎 스트레칭 지도'];
      const text = formatSoapNote(note);
      expect(text).toContain('환자 교육:');
      expect(text).toContain('  - 무릎 스트레칭 지도');
    });

    it('should handle fully populated SOAP note', () => {
      const note: SoapNote = {
        visitType: 'followup',
        patientId: 'p1',
        timestamp: new Date(),
        subjective: {
          symptoms: ['무릎 통증'],
          changesSinceLastVisit: '호전',
          painLevel: 3,
          treatmentResponse: '약 효과 있음',
        },
        objective: {
          vitalSigns: { bloodPressure: '130/80' },
          physicalFindings: ['압통(-)'],
          imagingFindings: ['정상'],
          labResults: ['정상'],
        },
        assessment: {
          diagnosis: ['M17.1'],
          progress: 'improving',
          clinicalImpression: '경과 양호',
        },
        plan: {
          medications: ['타이레놀'],
          physicalTherapy: ['도수치료'],
          additionalTests: [],
          followUp: '1달 후',
          patientEducation: ['운동 지도'],
        },
      };
      const text = formatSoapNote(note);
      expect(text.length).toBeGreaterThan(100);
      expect(text).toContain('무릎 통증');
      expect(text).toContain('호전');
    });
  });
});
