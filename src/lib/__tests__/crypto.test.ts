/**
 * @jest-environment node
 */

import { encrypt, decrypt, reEncrypt, needsReEncrypt, CURRENT_VERSION, maskRRN, maskPhone } from '@/lib/crypto';

// Set up test encryption key (32 bytes = 64 hex chars)
const TEST_KEY = 'a'.repeat(64);

beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY = TEST_KEY;
});

afterAll(() => {
  delete process.env.ENCRYPTION_MASTER_KEY;
});

describe('encrypt / decrypt round-trip', () => {
  it('encrypts and decrypts a simple string', () => {
    const plaintext = '900101-1234567';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts Korean text', () => {
    const plaintext = '홍길동의 주민번호';
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('encrypts and decrypts empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('generates different IV for each encryption', () => {
    const plaintext = 'same-input';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    // But both decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it('sets version to 1', () => {
    const encrypted = encrypt('test');
    expect(encrypted.version).toBe(1);
  });

  it('returns base64-encoded fields', () => {
    const encrypted = encrypt('test-data');
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    expect(encrypted.ciphertext).toMatch(base64Regex);
    expect(encrypted.iv).toMatch(base64Regex);
    expect(encrypted.tag).toMatch(base64Regex);
  });
});

describe('decrypt error handling', () => {
  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('sensitive-data');
    encrypted.ciphertext = Buffer.from('tampered').toString('base64');
    expect(() => decrypt(encrypted)).toThrow();
  });

  it('throws on tampered tag', () => {
    const encrypted = encrypt('sensitive-data');
    encrypted.tag = Buffer.from('0000000000000000').toString('base64');
    expect(() => decrypt(encrypted)).toThrow();
  });

  it('throws on wrong key', () => {
    const encrypted = encrypt('sensitive-data');
    process.env.ENCRYPTION_MASTER_KEY = 'b'.repeat(64);
    expect(() => decrypt(encrypted)).toThrow();
    process.env.ENCRYPTION_MASTER_KEY = TEST_KEY; // restore
  });
});

describe('key validation', () => {
  it('throws if ENCRYPTION_MASTER_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_MASTER_KEY;
    delete process.env.ENCRYPTION_MASTER_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_MASTER_KEY');
    process.env.ENCRYPTION_MASTER_KEY = saved;
  });

  it('throws if ENCRYPTION_MASTER_KEY is wrong length', () => {
    const saved = process.env.ENCRYPTION_MASTER_KEY;
    process.env.ENCRYPTION_MASTER_KEY = 'short';
    expect(() => encrypt('test')).toThrow('64-character hex');
    process.env.ENCRYPTION_MASTER_KEY = saved;
  });
});

describe('key rotation', () => {
  it('reEncrypt returns null if already current version', () => {
    const encrypted = encrypt('test');
    expect(encrypted.version).toBe(CURRENT_VERSION);
    expect(reEncrypt(encrypted)).toBeNull();
  });

  it('needsReEncrypt returns false for current version', () => {
    const encrypted = encrypt('test');
    expect(needsReEncrypt(encrypted)).toBe(false);
  });

  it('needsReEncrypt returns true for old version', () => {
    const encrypted = encrypt('test');
    encrypted.version = 99; // hypothetical old version
    expect(needsReEncrypt(encrypted)).toBe(true);
  });

  it('reEncrypt upgrades old version data', () => {
    // Simulate old version data (same key, different version number)
    const encrypted = encrypt('secret-data');
    // Pretend this was version 0 (same key maps to ENCRYPTION_MASTER_KEY)
    encrypted.version = 0;

    const reEncrypted = reEncrypt(encrypted);
    expect(reEncrypted).not.toBeNull();
    expect(reEncrypted!.version).toBe(CURRENT_VERSION);
    expect(decrypt(reEncrypted!)).toBe('secret-data');
  });
});

describe('maskRRN', () => {
  it('masks standard format with dash', () => {
    expect(maskRRN('900101-1234567')).toBe('900101-1******');
  });

  it('masks format without dash', () => {
    expect(maskRRN('9001011234567')).toBe('900101-1******');
  });

  it('masks everything for unrecognized format', () => {
    expect(maskRRN('12345')).toBe('*****');
  });

  it('masks female RRN correctly', () => {
    expect(maskRRN('950315-2345678')).toBe('950315-2******');
  });
});

describe('maskPhone', () => {
  it('masks 11-digit phone with dashes', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-****-5678');
  });

  it('masks 11-digit phone without dashes', () => {
    expect(maskPhone('01012345678')).toBe('010-****-5678');
  });

  it('masks 10-digit phone', () => {
    expect(maskPhone('0212345678')).toBe('021-***-5678');
  });

  it('handles short numbers by masking entirely', () => {
    expect(maskPhone('123')).toBe('***');
  });
});
