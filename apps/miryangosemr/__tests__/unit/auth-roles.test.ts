import { describe, it, expect } from 'vitest';

// Test role permission logic from AuthContext

type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'billing' | 'viewer';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  doctor: ['/dashboard', '/consulting', '/chart', '/prescription', '/lab', '/treatment', '/patients', '/records', '/inpatient', '/statistics', '/certificates'],
  nurse: ['/dashboard', '/reception', '/consulting', '/chart', '/treatment', '/lab', '/patients', '/inpatient', '/records'],
  receptionist: ['/dashboard', '/reception', '/patients', '/appointments', '/billing', '/records'],
  billing: ['/dashboard', '/billing', '/claims', '/statistics', '/reports', '/records'],
  viewer: ['/dashboard', '/chart', '/records', '/statistics'],
};

function hasPermission(role: UserRole, path: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.includes('*')) return true;
  return perms.some(p => path === p || path.startsWith(p + '/'));
}

describe('Role-Based Access Control', () => {
  describe('admin', () => {
    it('should have access to everything', () => {
      expect(hasPermission('admin', '/dashboard')).toBe(true);
      expect(hasPermission('admin', '/setup')).toBe(true);
      expect(hasPermission('admin', '/any/random/path')).toBe(true);
    });
  });

  describe('doctor', () => {
    it('should access consulting and chart', () => {
      expect(hasPermission('doctor', '/consulting')).toBe(true);
      expect(hasPermission('doctor', '/consulting/abc123')).toBe(true);
      expect(hasPermission('doctor', '/chart')).toBe(true);
      expect(hasPermission('doctor', '/chart/patient1/visit1')).toBe(true);
    });

    it('should access prescription', () => {
      expect(hasPermission('doctor', '/prescription')).toBe(true);
      expect(hasPermission('doctor', '/prescription/new')).toBe(true);
    });

    it('should not access billing', () => {
      expect(hasPermission('doctor', '/billing')).toBe(false);
      expect(hasPermission('doctor', '/claims')).toBe(false);
    });

    it('should not access setup', () => {
      expect(hasPermission('doctor', '/setup')).toBe(false);
    });
  });

  describe('nurse', () => {
    it('should access reception and treatment', () => {
      expect(hasPermission('nurse', '/reception')).toBe(true);
      expect(hasPermission('nurse', '/treatment')).toBe(true);
    });

    it('should access consulting (view)', () => {
      expect(hasPermission('nurse', '/consulting')).toBe(true);
    });

    it('should not access billing or claims', () => {
      expect(hasPermission('nurse', '/billing')).toBe(false);
      expect(hasPermission('nurse', '/claims')).toBe(false);
    });
  });

  describe('receptionist', () => {
    it('should access reception and appointments', () => {
      expect(hasPermission('receptionist', '/reception')).toBe(true);
      expect(hasPermission('receptionist', '/appointments')).toBe(true);
    });

    it('should access billing', () => {
      expect(hasPermission('receptionist', '/billing')).toBe(true);
    });

    it('should not access consulting or treatment', () => {
      expect(hasPermission('receptionist', '/consulting')).toBe(false);
      expect(hasPermission('receptionist', '/treatment')).toBe(false);
    });
  });

  describe('billing', () => {
    it('should access billing and claims', () => {
      expect(hasPermission('billing', '/billing')).toBe(true);
      expect(hasPermission('billing', '/claims')).toBe(true);
      expect(hasPermission('billing', '/reports')).toBe(true);
    });

    it('should not access consulting', () => {
      expect(hasPermission('billing', '/consulting')).toBe(false);
    });
  });

  describe('viewer', () => {
    it('should only access dashboard, chart, records, and statistics', () => {
      expect(hasPermission('viewer', '/dashboard')).toBe(true);
      expect(hasPermission('viewer', '/chart')).toBe(true);
      expect(hasPermission('viewer', '/records')).toBe(true);
      expect(hasPermission('viewer', '/statistics')).toBe(true);
    });

    it('should not access any write operations', () => {
      expect(hasPermission('viewer', '/reception')).toBe(false);
      expect(hasPermission('viewer', '/consulting')).toBe(false);
      expect(hasPermission('viewer', '/billing')).toBe(false);
      expect(hasPermission('viewer', '/setup')).toBe(false);
    });
  });

  describe('sub-path matching', () => {
    it('should match sub-paths correctly', () => {
      expect(hasPermission('doctor', '/chart/patient1')).toBe(true);
      expect(hasPermission('doctor', '/chart/patient1/visit1')).toBe(true);
    });

    it('should not match similar prefixes', () => {
      // /chart should not match /charts
      expect(hasPermission('viewer', '/charts')).toBe(false);
    });
  });
});
