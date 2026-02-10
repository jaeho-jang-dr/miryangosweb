import {
    detectXrayCommand,
    buildXrayOrderText,
    getBodyPartsByRegion,
    XRAY_BODY_PARTS,
    XrayBodyPart,
    XrayViewOption,
} from '@/data/xray-view-options';

// ─── detectXrayCommand ───────────────────────────────────────
describe('detectXrayCommand', () => {
    it('detects "왼무릎 xray" → knee Lt', () => {
        const result = detectXrayCommand('왼무릎 xray');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('knee');
        expect(result!.side).toBe('Lt');
    });

    it('detects "경추 엑스레이" → cspine (no side)', () => {
        const result = detectXrayCommand('경추 엑스레이');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('cspine');
        expect(result!.side).toBeNull();
    });

    it('detects "오른 어깨 xray" → shoulder Rt', () => {
        const result = detectXrayCommand('오른 어깨 xray');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('shoulder');
        expect(result!.side).toBe('Rt');
    });

    it('detects "양쪽 고관절 촬영" → hip Both', () => {
        const result = detectXrayCommand('양쪽 고관절 촬영');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('hip');
        expect(result!.side).toBe('Both');
    });

    it('detects "허리 엑스레이" → lspine (no side)', () => {
        const result = detectXrayCommand('허리 엑스레이');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('lspine');
        expect(result!.side).toBeNull();
    });

    it('detects "좌측 발목 xray" → ankle Lt', () => {
        const result = detectXrayCommand('좌측 발목 xray');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('ankle');
        expect(result!.side).toBe('Lt');
    });

    it('detects "골반 엑스레이 찍어" → pelvis (no side)', () => {
        const result = detectXrayCommand('골반 엑스레이 찍어');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('pelvis');
        expect(result!.side).toBeNull();
    });

    it('detects "왼쪽 손목 사진" → wrist Lt', () => {
        const result = detectXrayCommand('왼쪽 손목 사진');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('wrist');
        expect(result!.side).toBe('Lt');
    });

    it('returns null without x-ray trigger keyword', () => {
        expect(detectXrayCommand('무릎이 아파요')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(detectXrayCommand('')).toBeNull();
    });

    it('returns null for trigger without recognizable body part', () => {
        expect(detectXrayCommand('xray 해주세요')).toBeNull();
    });

    it('handles case insensitivity', () => {
        const result = detectXrayCommand('왼 무릎 X-RAY');
        expect(result).not.toBeNull();
        expect(result!.bodyPart.id).toBe('knee');
        expect(result!.side).toBe('Lt');
    });
});

// ─── buildXrayOrderText ──────────────────────────────────────
describe('buildXrayOrderText', () => {
    const sided: XrayBodyPart = {
        id: 'shoulder', nameEn: 'Shoulder', nameKo: '어깨',
        region: 'upper', sided: true, keywords: [], baseView: 'AP',
        viewOptions: [{ id: 'sh_1', label: 'AP (Internal/External Rotation)' }],
    };
    const nonSided: XrayBodyPart = {
        id: 'cspine', nameEn: 'C-Spine', nameKo: '경추',
        region: 'spine', sided: false, keywords: [], baseView: 'AP/Lat',
        viewOptions: [{ id: 'cs_1', label: 'AP/Lat' }],
    };

    it('builds Lt sided text', () => {
        expect(buildXrayOrderText(sided, sided.viewOptions[0], 'Lt'))
            .toBe('Lt Shoulder AP (Internal/External Rotation)');
    });

    it('builds Rt sided text', () => {
        expect(buildXrayOrderText(sided, sided.viewOptions[0], 'Rt'))
            .toBe('Rt Shoulder AP (Internal/External Rotation)');
    });

    it('builds Both sided text', () => {
        expect(buildXrayOrderText(sided, sided.viewOptions[0], 'Both'))
            .toBe('Both Shoulder AP (Internal/External Rotation)');
    });

    it('builds non-sided text without side prefix', () => {
        expect(buildXrayOrderText(nonSided, nonSided.viewOptions[0], null))
            .toBe('C-Spine AP/Lat');
    });

    it('ignores side for non-sided body part', () => {
        expect(buildXrayOrderText(nonSided, nonSided.viewOptions[0], 'Lt'))
            .toBe('C-Spine AP/Lat');
    });

    it('builds sided part text when side is null', () => {
        expect(buildXrayOrderText(sided, sided.viewOptions[0], null))
            .toBe('Shoulder AP (Internal/External Rotation)');
    });
});

// ─── getBodyPartsByRegion ────────────────────────────────────
describe('getBodyPartsByRegion', () => {
    it('returns all 5 regions', () => {
        const grouped = getBodyPartsByRegion();
        const keys = Object.keys(grouped);
        expect(keys).toHaveLength(5);
        expect(keys).toContain('척추 (Spine)');
        expect(keys).toContain('상지 (Upper Extremity)');
        expect(keys).toContain('하지 (Lower Extremity)');
        expect(keys).toContain('체간 (Trunk)');
        expect(keys).toContain('특수 촬영 (Special)');
    });

    it('groups all body parts without loss', () => {
        const grouped = getBodyPartsByRegion();
        const total = Object.values(grouped).reduce((sum, parts) => sum + parts.length, 0);
        expect(total).toBe(XRAY_BODY_PARTS.length);
    });

    it('spine region has correct 5 parts in order', () => {
        const grouped = getBodyPartsByRegion();
        const spine = grouped['척추 (Spine)'];
        expect(spine).toHaveLength(5);
        expect(spine.map(p => p.id)).toEqual([
            'cspine', 'tspine', 'lspine', 'sacrum', 'whole_spine',
        ]);
    });
});

// ─── Data Integrity ──────────────────────────────────────────
describe('Data Integrity', () => {
    it('has 28 unique body part IDs', () => {
        expect(XRAY_BODY_PARTS).toHaveLength(28);
        const ids = XRAY_BODY_PARTS.map(p => p.id);
        expect(new Set(ids).size).toBe(28);
    });

    it('all viewOption IDs are unique across all body parts', () => {
        const allViewIds: string[] = [];
        for (const part of XRAY_BODY_PARTS) {
            for (const view of part.viewOptions) {
                allViewIds.push(view.id);
            }
        }
        expect(new Set(allViewIds).size).toBe(allViewIds.length);
    });
});
