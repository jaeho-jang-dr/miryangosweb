import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminRole } from '@/hooks/useAdminRole';

// Get mocked Firebase functions from jest.setup.js
const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged as jest.Mock;
const mockGetDoc = require('firebase/firestore').getDoc as jest.Mock;
const mockDoc = require('firebase/firestore').doc as jest.Mock;

// Mock the firebase-public module
jest.mock('@/lib/firebase-public', () => ({
    auth: { currentUser: null },
    db: {},
}));

describe('useAdminRole', () => {
    let authCallback: ((user: any) => void) | null = null;
    let mockUnsubscribe: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        authCallback = null;
        mockUnsubscribe = jest.fn();

        mockOnAuthStateChanged.mockImplementation((_auth: any, callback: (user: any) => void) => {
            authCallback = callback;
            return mockUnsubscribe;
        });

        mockDoc.mockReturnValue('mock-doc-ref');
    });

    // ─── Initial State ────────────────────────────────────────
    it('starts with loading=true and role=null', () => {
        const { result } = renderHook(() => useAdminRole());

        expect(result.current.loading).toBe(true);
        expect(result.current.role).toBeNull();
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isManager).toBe(false);
        expect(result.current.isOperator).toBe(false);
    });

    it('subscribes to auth state on mount', () => {
        renderHook(() => useAdminRole());
        expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    });

    it('unsubscribes from auth state on unmount', () => {
        const { unmount } = renderHook(() => useAdminRole());
        unmount();
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    // ─── User Not Logged In ───────────────────────────────────
    it('sets role=null and loading=false when user is not logged in', async () => {
        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!(null);
        });

        expect(result.current.role).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.isAdmin).toBe(false);
    });

    // ─── Admin User ───────────────────────────────────────────
    it('sets role=admin when Firestore document has admin role', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'admin' }),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-123' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('admin');
        expect(result.current.isAdmin).toBe(true);
        expect(result.current.isManager).toBe(false);
        expect(result.current.isOperator).toBe(false);
    });

    // ─── Manager User ─────────────────────────────────────────
    it('sets role=manager when Firestore document has manager role', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'manager' }),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-456' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('manager');
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isManager).toBe(true);
        expect(result.current.isOperator).toBe(false);
    });

    // ─── Operator User ────────────────────────────────────────
    it('sets role=operator when Firestore document has operator role', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'operator' }),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-789' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('operator');
        expect(result.current.isAdmin).toBe(false);
        expect(result.current.isManager).toBe(false);
        expect(result.current.isOperator).toBe(true);
    });

    // ─── Default Role ─────────────────────────────────────────
    it('defaults to role=user when Firestore document exists but has no role field', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({}),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-abc' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('user');
        expect(result.current.isAdmin).toBe(false);
    });

    it('defaults to role=user when Firestore document does not exist', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-new' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('user');
    });

    // ─── Error Handling ───────────────────────────────────────
    it('defaults to role=user when getDoc throws an error', async () => {
        mockGetDoc.mockRejectedValue(new Error('Firestore error'));

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-err' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.role).toBe('user');
        expect(result.current.isAdmin).toBe(false);
    });

    // ─── checkAccess Helper ───────────────────────────────────
    it('checkAccess returns true when user role is in permitted roles', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'admin' }),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-admin' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.checkAccess(['admin', 'manager'])).toBe(true);
    });

    it('checkAccess returns false when user role is not in permitted roles', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ role: 'user' }),
        });

        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!({ uid: 'user-regular' });
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.checkAccess(['admin', 'manager'])).toBe(false);
    });

    it('checkAccess returns false when role is null (not logged in)', async () => {
        const { result } = renderHook(() => useAdminRole());

        await act(async () => {
            authCallback!(null);
        });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // role is null, so '' should not be in the permitted roles
        expect(result.current.checkAccess(['admin', 'manager'])).toBe(false);
    });
});
