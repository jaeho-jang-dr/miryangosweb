/**
 * @jest-environment node
 */

import {
  generateKeyPair,
  signFields,
  verifySignature,
  buildCanonicalPayload,
  verifyVisitSignature,
} from '@/lib/digital-signature';

describe('generateKeyPair', () => {
  it('generates PEM-encoded public and private keys', () => {
    const keys = generateKeyPair();
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
  });

  it('generates unique key pairs each time', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.privateKey).not.toBe(b.privateKey);
  });
});

describe('buildCanonicalPayload', () => {
  it('sorts keys alphabetically', () => {
    const payload = buildCanonicalPayload({ z: 1, a: 2, m: 3 });
    expect(payload).toBe('a:2|m:3|z:1');
  });

  it('handles nested objects', () => {
    const payload = buildCanonicalPayload({ name: '홍길동', data: { x: 1 } });
    expect(payload).toContain('data:');
    expect(payload).toContain('name:"홍길동"');
  });

  it('handles null/undefined values', () => {
    const payload = buildCanonicalPayload({ a: null, b: undefined });
    expect(payload).toBe('a:""|b:""');
  });

  it('is deterministic (same input → same output)', () => {
    const fields = { diagnosis: 'M17.1', patientId: 'P001', chiefComplaint: '무릎 통증' };
    const a = buildCanonicalPayload(fields);
    const b = buildCanonicalPayload(fields);
    expect(a).toBe(b);
  });
});

describe('signFields / verifySignature round-trip', () => {
  const keys = generateKeyPair();

  it('signs and verifies simple fields', () => {
    const fields = { name: '홍길동', diagnosis: 'M17.1' };
    const sig = signFields(fields, keys.privateKey);
    expect(typeof sig).toBe('string');
    expect(sig.length).toBeGreaterThan(0);

    const valid = verifySignature(fields, sig, keys.publicKey);
    expect(valid).toBe(true);
  });

  it('fails verification on tampered data', () => {
    const fields = { name: '홍길동', diagnosis: 'M17.1' };
    const sig = signFields(fields, keys.privateKey);

    const tampered = { ...fields, diagnosis: 'M17.2' };
    const valid = verifySignature(tampered, sig, keys.publicKey);
    expect(valid).toBe(false);
  });

  it('fails verification with wrong public key', () => {
    const otherKeys = generateKeyPair();
    const fields = { test: 'data' };
    const sig = signFields(fields, keys.privateKey);

    const valid = verifySignature(fields, sig, otherKeys.publicKey);
    expect(valid).toBe(false);
  });

  it('signs Korean text correctly', () => {
    const fields = {
      chiefComplaint: '우측 무릎 통증 3일째',
      diagnosis: '무릎의 내측 반월상 연골 손상',
      treatmentNote: '물리치료 + 약물처방',
    };
    const sig = signFields(fields, keys.privateKey);
    expect(verifySignature(fields, sig, keys.publicKey)).toBe(true);
  });

  it('handles empty fields', () => {
    const fields = {};
    const sig = signFields(fields, keys.privateKey);
    expect(verifySignature(fields, sig, keys.publicKey)).toBe(true);
  });
});

describe('verifyVisitSignature', () => {
  const keys = generateKeyPair();

  it('verifies a visit-like record with selected fields', () => {
    const visitData = {
      id: 'v001',
      patientId: 'p001',
      patientName: '김환자',
      status: 'completed',
      chiefComplaint: '허리 통증',
      diagnosis: 'M54.5',
      treatmentNote: '물리치료 시행',
      // These should NOT be signed (not in signedFields)
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    };

    const signedFields = ['id', 'patientId', 'patientName', 'status', 'chiefComplaint', 'diagnosis', 'treatmentNote'];

    // Build only the signed fields to sign
    const fieldsToSign: Record<string, unknown> = {};
    for (const key of signedFields) {
      if (visitData[key as keyof typeof visitData] !== undefined) {
        fieldsToSign[key] = visitData[key as keyof typeof visitData];
      }
    }
    const sig = signFields(fieldsToSign, keys.privateKey);

    const valid = verifyVisitSignature(visitData, sig, keys.publicKey, signedFields);
    expect(valid).toBe(true);
  });

  it('detects tampered visit data', () => {
    const visitData = {
      id: 'v001',
      patientId: 'p001',
      diagnosis: 'M54.5',
    };
    const signedFields = ['id', 'patientId', 'diagnosis'];
    const fieldsToSign: Record<string, unknown> = {};
    for (const key of signedFields) {
      fieldsToSign[key] = visitData[key as keyof typeof visitData];
    }
    const sig = signFields(fieldsToSign, keys.privateKey);

    // Tamper
    const tampered = { ...visitData, diagnosis: 'TAMPERED' };
    expect(verifyVisitSignature(tampered, sig, keys.publicKey, signedFields)).toBe(false);
  });
});
