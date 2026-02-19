import { renderHook, waitFor } from '@testing-library/react';
import { useLandingData } from '@/hooks/useLandingData';

// Get mocked Firebase functions from jest.setup.js
const mockGetDoc = require('firebase/firestore').getDoc as jest.Mock;
const mockGetDocs = require('firebase/firestore').getDocs as jest.Mock;
const mockDoc = require('firebase/firestore').doc as jest.Mock;
const mockCollection = require('firebase/firestore').collection as jest.Mock;
const mockQuery = require('firebase/firestore').query as jest.Mock;
const mockWhere = require('firebase/firestore').where as jest.Mock;
const mockOrderBy = require('firebase/firestore').orderBy as jest.Mock;
const mockLimit = require('firebase/firestore').limit as jest.Mock;

// Mock the firebase-public module
jest.mock('@/lib/firebase-public', () => ({
    db: {},
}));

describe('useLandingData', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementations for query builders
        mockDoc.mockReturnValue('mock-doc-ref');
        mockCollection.mockReturnValue('mock-collection-ref');
        mockQuery.mockReturnValue('mock-query-ref');
        mockWhere.mockReturnValue('mock-where');
        mockOrderBy.mockReturnValue('mock-orderBy');
        mockLimit.mockReturnValue('mock-limit');
    });

    // ─── Initial State ────────────────────────────────────────
    it('starts with loading=true and default clinic info', () => {
        // Prevent data loading by making getDoc/getDocs hang
        mockGetDoc.mockReturnValue(new Promise(() => {}));
        mockGetDocs.mockReturnValue(new Promise(() => {}));

        const { result } = renderHook(() => useLandingData());

        expect(result.current.loading).toBe(true);
        expect(result.current.notices).toEqual([]);
        expect(result.current.cartoons).toEqual([]);
        expect(result.current.clinicInfo.name).toBe('밀양정형외과');
        expect(result.current.clinicInfo.phone).toBe('055-356-5500');
    });

    // ─── Successful Data Fetch ────────────────────────────────
    it('fetches and sets notices from Firestore', async () => {
        const mockNotices = [
            { id: 'n1', title: '공지1', isVisible: true },
            { id: 'n2', title: '공지2', isVisible: true },
        ];

        mockGetDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        });

        mockGetDocs
            .mockResolvedValueOnce({
                // notices query
                docs: mockNotices.map(n => ({
                    id: n.id,
                    data: () => ({ title: n.title, isVisible: n.isVisible }),
                })),
            })
            .mockResolvedValueOnce({
                // cartoons query
                docs: [],
            });

        const { result } = renderHook(() => useLandingData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.notices).toHaveLength(2);
        expect(result.current.notices[0].id).toBe('n1');
        expect(result.current.notices[0].title).toBe('공지1');
        expect(result.current.notices[1].id).toBe('n2');
    });

    it('fetches and sets cartoons (disease articles) from Firestore', async () => {
        const mockCartoons = [
            { id: 'a1', title: '질환만화1', type: 'disease', isVisible: true },
            { id: 'a2', title: '질환만화2', type: 'disease', isVisible: true },
        ];

        mockGetDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        });

        mockGetDocs
            .mockResolvedValueOnce({
                // notices query
                docs: [],
            })
            .mockResolvedValueOnce({
                // cartoons query
                docs: mockCartoons.map(c => ({
                    id: c.id,
                    data: () => ({ title: c.title, type: c.type, isVisible: c.isVisible }),
                })),
            });

        const { result } = renderHook(() => useLandingData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.cartoons).toHaveLength(2);
        expect(result.current.cartoons[0].id).toBe('a1');
        expect(result.current.cartoons[0].title).toBe('질환만화1');
    });

    it('merges settings data with default clinic info', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                name: '미르양정형외과',
                phone: '055-999-9999',
            }),
        });

        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        const { result } = renderHook(() => useLandingData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Merged fields
        expect(result.current.clinicInfo.name).toBe('미르양정형외과');
        expect(result.current.clinicInfo.phone).toBe('055-999-9999');
        // Default fields preserved
        expect(result.current.clinicInfo.address).toBe('경상남도 밀양시 중앙로 451');
    });

    it('keeps default clinic info when settings do not exist', async () => {
        mockGetDoc.mockResolvedValue({
            exists: () => false,
            data: () => null,
        });

        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        const { result } = renderHook(() => useLandingData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.clinicInfo.name).toBe('밀양정형외과');
        expect(result.current.clinicInfo.phone).toBe('055-356-5500');
        expect(result.current.clinicInfo.lunchTime).toBe('13:00 - 14:00');
        expect(result.current.clinicInfo.weekdayHours).toBe('08:30 - 17:30');
        expect(result.current.clinicInfo.saturdayHours).toBe('08:30 - 12:30 (1, 3주 휴무)');
        expect(result.current.clinicInfo.holidayInfo).toBe('일요일, 공휴일 휴진');
    });

    // ─── Error Handling ───────────────────────────────────────
    it('sets loading=false even when data fetch fails', async () => {
        mockGetDoc.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useLandingData());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        // Should still have defaults after error
        expect(result.current.notices).toEqual([]);
        expect(result.current.cartoons).toEqual([]);
        expect(result.current.clinicInfo.name).toBe('밀양정형외과');
    });

    // ─── Firestore Query Construction ─────────────────────────
    it('queries notices with correct filters (isVisible, ordered, limited to 3)', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        renderHook(() => useLandingData());

        await waitFor(() => {
            expect(mockCollection).toHaveBeenCalled();
        });

        // Verify collection was called for notices
        expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'notices');

        // Verify where filter for isVisible
        expect(mockWhere).toHaveBeenCalledWith('isVisible', '==', true);

        // Verify orderBy for createdAt desc
        expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');

        // Verify limit of 3 for notices
        expect(mockLimit).toHaveBeenCalledWith(3);
    });

    it('queries articles with type=disease filter and limit of 4', async () => {
        mockGetDoc.mockResolvedValue({ exists: () => false, data: () => null });
        mockGetDocs
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        renderHook(() => useLandingData());

        await waitFor(() => {
            expect(mockCollection).toHaveBeenCalled();
        });

        // Verify collection was called for articles
        expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'articles');

        // Verify where filter for type=disease
        expect(mockWhere).toHaveBeenCalledWith('type', '==', 'disease');

        // Verify limit of 4 for cartoons
        expect(mockLimit).toHaveBeenCalledWith(4);
    });
});
