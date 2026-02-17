import {
  durResultToOperationOutcome,
  drugLookupToMedication,
  pharmacyToOrganization,
  extractBusinessHours,
} from '../fhir/converters/hira-bridge-converter';
import type {
  EmrDurCheckResult,
  EmrDurAlert,
  EmrDrugLookupResult,
  PharmacyDetailInfo,
} from '@/types/hira';

describe('fhir/converters/hira-bridge-converter', () => {
  describe('durResultToOperationOutcome', () => {
    it('should return OperationOutcome resourceType', () => {
      const result: EmrDurCheckResult = {
        critical: [],
        warnings: [],
        info: [],
        totalAlerts: 0,
        isSafe: true,
        drugCount: 2,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.resourceType).toBe('OperationOutcome');
    });

    it('should create PASS issue when no alerts exist', () => {
      const result: EmrDurCheckResult = {
        critical: [],
        warnings: [],
        info: [],
        totalAlerts: 0,
        isSafe: true,
        drugCount: 3,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue).toHaveLength(1);
      expect(outcome.issue[0].severity).toBe('information');
      expect(outcome.issue[0].details?.coding?.[0]?.code).toBe('PASS');
      expect(outcome.issue[0].details?.text).toContain('3개 약물');
    });

    it('should map critical alerts to error severity', () => {
      const criticalAlert: EmrDurAlert = {
        type: 'contraindication',
        severity: 'critical',
        ingredient: '아세트아미노펜',
        relatedIngredient: '이부프로펜',
        message: '병용금기: 아세트아미노펜 + 이부프로펜',
        detail: '간독성 위험',
      };
      const result: EmrDurCheckResult = {
        critical: [criticalAlert],
        warnings: [],
        info: [],
        totalAlerts: 1,
        isSafe: false,
        drugCount: 2,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue).toHaveLength(1);
      expect(outcome.issue[0].severity).toBe('error');
      expect(outcome.issue[0].code).toBe('business-rule');
    });

    it('should map warning alerts to warning severity', () => {
      const warningAlert: EmrDurAlert = {
        type: 'dosage-caution',
        severity: 'warning',
        ingredient: '록소프로펜',
        message: '용량주의: 록소프로펜',
      };
      const result: EmrDurCheckResult = {
        critical: [],
        warnings: [warningAlert],
        info: [],
        totalAlerts: 1,
        isSafe: true,
        drugCount: 1,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue[0].severity).toBe('warning');
    });

    it('should map info alerts to information severity', () => {
      const infoAlert: EmrDurAlert = {
        type: 'duplicate-efficacy',
        severity: 'info',
        ingredient: 'A',
        relatedIngredient: 'B',
        message: '효능중복',
      };
      const result: EmrDurCheckResult = {
        critical: [],
        warnings: [],
        info: [infoAlert],
        totalAlerts: 1,
        isSafe: true,
        drugCount: 2,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue[0].severity).toBe('information');
    });

    it('should include all alerts from all severity levels', () => {
      const result: EmrDurCheckResult = {
        critical: [
          { type: 'contraindication', severity: 'critical', ingredient: 'A', message: 'msg1' },
        ],
        warnings: [
          { type: 'dosage-caution', severity: 'warning', ingredient: 'B', message: 'msg2' },
        ],
        info: [
          { type: 'split-caution', severity: 'info', ingredient: 'C', message: 'msg3' },
        ],
        totalAlerts: 3,
        isSafe: false,
        drugCount: 3,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue).toHaveLength(3);
    });

    it('should include expression with medication references', () => {
      const alert: EmrDurAlert = {
        type: 'contraindication',
        severity: 'critical',
        ingredient: 'DrugA',
        relatedIngredient: 'DrugB',
        message: '병용금기',
      };
      const result: EmrDurCheckResult = {
        critical: [alert],
        warnings: [],
        info: [],
        totalAlerts: 1,
        isSafe: false,
        drugCount: 2,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue[0].expression).toContain('MedicationRequest.medication[DrugA]');
      expect(outcome.issue[0].expression).toContain('MedicationRequest.medication[DrugB]');
    });

    it('should map DUR type codes correctly', () => {
      const alert: EmrDurAlert = {
        type: 'pregnancy-taboo',
        severity: 'critical',
        ingredient: 'DrugX',
        message: '임부금기',
      };
      const result: EmrDurCheckResult = {
        critical: [alert],
        warnings: [],
        info: [],
        totalAlerts: 1,
        isSafe: false,
        drugCount: 1,
        checkedAt: '2025-01-01T00:00:00Z',
      };
      const outcome = durResultToOperationOutcome(result);
      expect(outcome.issue[0].details?.coding?.[0]?.code).toBe('DUR-PREG');
      expect(outcome.issue[0].details?.coding?.[0]?.display).toBe('임부금기');
    });
  });

  describe('drugLookupToMedication', () => {
    it('should create a Medication resource', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: null,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, '아세트아미노펜');
      expect(med.resourceType).toBe('Medication');
      expect(med.status).toBe('active');
    });

    it('should set drug name as code text', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: null,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, '이부프로펜');
      expect(med.code?.text).toBe('이부프로펜');
    });

    it('should include ingredient code when available', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: {
          cpntCd: 'ING001',
          cpntNm: '아세트아미노펜',
          cpntNmEng: 'Acetaminophen',
          fomlNm: '정제',
          fomlCd: 'TAB',
        } as any,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, '아세트아미노펜');
      expect(med.id).toBe('ING001');
      const coding = med.code?.coding?.find(c =>
        c.system?.includes('hira-drug-ingredient')
      );
      expect(coding).toBeDefined();
      expect(coding!.code).toBe('ING001');
      expect(coding!.display).toBe('아세트아미노펜');
    });

    it('should include English name when available', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: {
          cpntCd: 'ING001',
          cpntNm: '아세트아미노펜',
          cpntNmEng: 'Acetaminophen',
        } as any,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, '아세트아미노펜');
      const rxCoding = med.code?.coding?.find(c =>
        c.system?.includes('rxnorm')
      );
      expect(rxCoding?.display).toBe('Acetaminophen');
    });

    it('should set form when available', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: {
          cpntCd: 'ING001',
          cpntNm: 'Test',
          fomlNm: '정제',
          fomlCd: 'TAB',
        } as any,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, 'Test');
      expect(med.form?.text).toBe('정제');
    });

    it('should include effects as ingredients', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: null,
        effects: [
          { meftDivNo: 'EFF001', meftDivNm: '진통제' } as any,
          { meftDivNo: 'EFF002', meftDivNm: '해열제' } as any,
        ],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, 'TestDrug');
      expect(med.ingredient).toHaveLength(2);
      expect(med.ingredient![0].isActive).toBe(true);
      expect(med.ingredient![0].itemCodeableConcept?.text).toBe('진통제');
    });

    it('should include DUR flags as meta tags', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: null,
        effects: [],
        prescription: null,
        durFlags: ['contraindication', 'dosage-caution'],
      };
      const med = drugLookupToMedication(lookup, 'DrugX');
      expect(med.meta?.tag).toHaveLength(2);
      expect(med.meta!.tag![0].code).toBe('DUR-CI');
      expect(med.meta!.tag![1].code).toBe('DUR-DOSE');
    });

    it('should handle empty lookup result', () => {
      const lookup: EmrDrugLookupResult = {
        ingredient: null,
        effects: [],
        prescription: null,
        durFlags: [],
      };
      const med = drugLookupToMedication(lookup, 'UnknownDrug');
      expect(med.resourceType).toBe('Medication');
      expect(med.id).toBe('drug-UnknownDrug');
      expect(med.ingredient).toBeUndefined();
      expect(med.meta).toBeUndefined();
    });
  });

  describe('pharmacyToOrganization', () => {
    const mockPharmacy: PharmacyDetailInfo = {
      ykiho: 'PH001',
      yadmNm: '밀양약국',
      addr: '경남 밀양시 중앙로 100',
      telno: '055-352-1234',
      sidoCdNm: '경남',
      sgguCdNm: '밀양시',
    } as PharmacyDetailInfo;

    it('should create an Organization resource', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.resourceType).toBe('Organization');
    });

    it('should set pharmacy ID as organization ID', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.id).toBe('PH001');
    });

    it('should set active to true', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.active).toBe(true);
    });

    it('should set type as healthcare provider', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.type?.[0]?.coding?.[0]?.code).toBe('prov');
      expect(org.type?.[0]?.text).toBe('약국');
    });

    it('should set pharmacy name', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.name).toBe('밀양약국');
    });

    it('should set address with state and district', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.address?.[0]?.use).toBe('work');
      expect(org.address?.[0]?.text).toBe('경남 밀양시 중앙로 100');
      expect(org.address?.[0]?.state).toBe('경남');
      expect(org.address?.[0]?.district).toBe('밀양시');
    });

    it('should set HIRA institution identifier', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.identifier?.[0]?.use).toBe('official');
      expect(org.identifier?.[0]?.value).toBe('PH001');
    });

    it('should set phone telecom', () => {
      const org = pharmacyToOrganization(mockPharmacy);
      expect(org.telecom?.[0]?.system).toBe('phone');
      expect(org.telecom?.[0]?.value).toBe('055-352-1234');
    });

    it('should handle pharmacy without phone', () => {
      const noPhone: PharmacyDetailInfo = {
        ...mockPharmacy,
        telno: '',
      };
      const org = pharmacyToOrganization(noPhone);
      expect(org.telecom).toBeUndefined();
    });
  });

  describe('extractBusinessHours', () => {
    it('should extract business hours from pharmacy data', () => {
      const pharmacy = {
        ykiho: 'PH001',
        yadmNm: 'Test',
        addr: 'Test',
        sidoCdNm: 'Test',
        sgguCdNm: 'Test',
        dutyTime1s: '0900',
        dutyTime1c: '1800',
        dutyTime2s: '0900',
        dutyTime2c: '1800',
      } as unknown as PharmacyDetailInfo;

      const hours = extractBusinessHours(pharmacy);
      expect(hours.length).toBeGreaterThan(0);
    });

    it('should format time strings correctly', () => {
      const pharmacy = {
        ykiho: 'PH001',
        yadmNm: 'Test',
        addr: 'Test',
        sidoCdNm: 'Test',
        sgguCdNm: 'Test',
        dutyTime1s: '0900',
        dutyTime1c: '1800',
      } as unknown as PharmacyDetailInfo;

      const hours = extractBusinessHours(pharmacy);
      expect(hours[0].openingTime).toBe('09:00');
      expect(hours[0].closingTime).toBe('18:00');
    });

    it('should map day numbers to Korean day names', () => {
      const pharmacy = {
        ykiho: 'PH001',
        yadmNm: 'Test',
        addr: 'Test',
        sidoCdNm: 'Test',
        sgguCdNm: 'Test',
        dutyTime1s: '0900',
        dutyTime1c: '1800',
        dutyTime6s: '0900',
        dutyTime6c: '1300',
      } as unknown as PharmacyDetailInfo;

      const hours = extractBusinessHours(pharmacy);
      expect(hours.find(h => h.day === '월')).toBeDefined();
      expect(hours.find(h => h.day === '토')).toBeDefined();
    });

    it('should return empty array when no hours are available', () => {
      const pharmacy = {
        ykiho: 'PH001',
        yadmNm: 'Test',
        addr: 'Test',
        sidoCdNm: 'Test',
        sgguCdNm: 'Test',
      } as PharmacyDetailInfo;

      const hours = extractBusinessHours(pharmacy);
      expect(hours).toHaveLength(0);
    });

    it('should skip days with only start time and no close time', () => {
      const pharmacy = {
        ykiho: 'PH001',
        yadmNm: 'Test',
        addr: 'Test',
        sidoCdNm: 'Test',
        sgguCdNm: 'Test',
        dutyTime1s: '0900',
        // missing dutyTime1c
      } as unknown as PharmacyDetailInfo;

      const hours = extractBusinessHours(pharmacy);
      expect(hours).toHaveLength(0);
    });
  });
});
