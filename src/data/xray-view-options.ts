/**
 * Comprehensive X-ray View Options for Orthopedic Clinical System
 *
 * Covers all joints, spine segments, and extremities with:
 * - Korean voice keywords for STT detection
 * - Side support (Lt/Rt/Both) where applicable
 * - Preset view combinations for quick selection
 */

export interface XrayViewOption {
    id: string;
    label: string;          // Full view description (e.g., "AP/Lat + Merchant View")
}

export interface XrayBodyPart {
    id: string;
    nameEn: string;         // English name
    nameKo: string;         // Korean name
    region: 'spine' | 'upper' | 'lower' | 'trunk' | 'special';
    sided: boolean;         // Whether Lt/Rt/Both applies
    keywords: string[];     // Korean voice trigger keywords
    baseView: string;       // Default/base view (e.g., "AP/Lat")
    viewOptions: XrayViewOption[];  // All preset view combinations
}

// ============================================================
//  SPINE REGION
// ============================================================

const CSPINE: XrayBodyPart = {
    id: 'cspine',
    nameEn: 'C-Spine',
    nameKo: '경추',
    region: 'spine',
    sided: false,
    keywords: ['경추', '목', 'c-spine', 'cspine', '씨스파인', '씨스빠인', '목뼈'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'cs_1', label: 'AP/Lat' },
        { id: 'cs_2', label: 'AP/Lat + Open Mouth (Odontoid)' },
        { id: 'cs_3', label: 'AP/Lat + Both Oblique' },
        { id: 'cs_4', label: 'Flexion/Extension Lat' },
        { id: 'cs_5', label: 'AP/Lat + Open Mouth + Both Oblique (Full Series)' },
        { id: 'cs_6', label: "AP/Lat + Swimmer's View" },
    ]
};

const TSPINE: XrayBodyPart = {
    id: 'tspine',
    nameEn: 'T-Spine',
    nameKo: '흉추',
    region: 'spine',
    sided: false,
    keywords: ['흉추', '등뼈', 't-spine', 'tspine', '티스파인', '등'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'ts_1', label: 'AP/Lat' },
        { id: 'ts_2', label: "AP/Lat + Swimmer's View" },
    ]
};

const LSPINE: XrayBodyPart = {
    id: 'lspine',
    nameEn: 'L-Spine',
    nameKo: '요추',
    region: 'spine',
    sided: false,
    keywords: ['요추', '허리', 'l-spine', 'lspine', '엘스파인', '허리뼈', '럼바'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'ls_1', label: 'AP/Lat' },
        { id: 'ls_2', label: 'AP/Lat + Both Oblique' },
        { id: 'ls_3', label: 'Flexion/Extension Lat' },
        { id: 'ls_4', label: 'AP/Lat + Spot Lat L5-S1' },
        { id: 'ls_5', label: 'AP/Lat + Both Oblique + Spot L5-S1 (Full Series)' },
    ]
};

const SACRUM: XrayBodyPart = {
    id: 'sacrum',
    nameEn: 'Sacrum/Coccyx',
    nameKo: '천추/미추',
    region: 'spine',
    sided: false,
    keywords: ['천추', '미추', '꼬리뼈', '천골', '미골', 'sacrum', 'coccyx'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'sa_1', label: 'Sacrum AP/Lat' },
        { id: 'sa_2', label: 'Coccyx AP/Lat (Tilted)' },
        { id: 'sa_3', label: 'Sacrum + Coccyx AP/Lat' },
    ]
};

const WHOLE_SPINE: XrayBodyPart = {
    id: 'whole_spine',
    nameEn: 'Whole Spine',
    nameKo: '전체척추',
    region: 'spine',
    sided: false,
    keywords: ['전체척추', '전척추', 'whole spine', '척추전체', '스파인전체', '측만증'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'ws_1', label: 'AP/Lat' },
        { id: 'ws_2', label: 'Standing AP/Lat (Scoliosis Series)' },
        { id: 'ws_3', label: 'Standing AP/Lat + Bending View' },
    ]
};

// ============================================================
//  UPPER EXTREMITY
// ============================================================

const SHOULDER: XrayBodyPart = {
    id: 'shoulder',
    nameEn: 'Shoulder',
    nameKo: '어깨',
    region: 'upper',
    sided: true,
    keywords: ['어깨', 'shoulder', '숄더', '견관절', '견갑관절'],
    baseView: 'AP',
    viewOptions: [
        { id: 'sh_1', label: 'AP (Internal/External Rotation)' },
        { id: 'sh_2', label: 'AP + Axillary View' },
        { id: 'sh_3', label: 'AP + Y-View (Scapular Y)' },
        { id: 'sh_4', label: 'AP + Y-View + Axillary View' },
        { id: 'sh_5', label: 'AP + Outlet View (Supraspinatus)' },
        { id: 'sh_6', label: 'AC Joint (Zanca View)' },
        { id: 'sh_7', label: 'AP + West Point View' },
        { id: 'sh_8', label: 'AP + Stryker Notch View' },
        { id: 'sh_9', label: 'AP + Y-View + Axillary + Outlet (Full Series)' },
    ]
};

const CLAVICLE: XrayBodyPart = {
    id: 'clavicle',
    nameEn: 'Clavicle',
    nameKo: '쇄골',
    region: 'upper',
    sided: true,
    keywords: ['쇄골', 'clavicle', '클라비클', '빗장뼈'],
    baseView: 'AP',
    viewOptions: [
        { id: 'cl_1', label: 'AP' },
        { id: 'cl_2', label: 'AP + 45° Cephalic Tilt' },
        { id: 'cl_3', label: 'AP + Apical Lordotic View' },
    ]
};

const SCAPULA: XrayBodyPart = {
    id: 'scapula',
    nameEn: 'Scapula',
    nameKo: '견갑골',
    region: 'upper',
    sided: true,
    keywords: ['견갑골', 'scapula', '스캐풀라', '날개뼈'],
    baseView: 'AP',
    viewOptions: [
        { id: 'sc_1', label: 'AP' },
        { id: 'sc_2', label: 'AP + Y-View (Lateral)' },
    ]
};

const HUMERUS: XrayBodyPart = {
    id: 'humerus',
    nameEn: 'Humerus',
    nameKo: '상완골',
    region: 'upper',
    sided: true,
    keywords: ['상완골', '상완', 'humerus', '윗팔뼈', '윗팔', '상박'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'hu_1', label: 'AP/Lat' },
        { id: 'hu_2', label: 'AP/Lat (Including Shoulder)' },
        { id: 'hu_3', label: 'AP/Lat (Including Elbow)' },
    ]
};

const ELBOW: XrayBodyPart = {
    id: 'elbow',
    nameEn: 'Elbow',
    nameKo: '팔꿈치',
    region: 'upper',
    sided: true,
    keywords: ['팔꿈치', 'elbow', '엘보', '주관절', '팔꿉치'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'el_1', label: 'AP/Lat' },
        { id: 'el_2', label: 'AP/Lat + Both Oblique' },
        { id: 'el_3', label: 'AP/Lat + Radial Head View' },
        { id: 'el_4', label: 'AP/Lat + Axial View' },
    ]
};

const FOREARM: XrayBodyPart = {
    id: 'forearm',
    nameEn: 'Forearm',
    nameKo: '전완',
    region: 'upper',
    sided: true,
    keywords: ['전완', '아래팔', 'forearm', '포암', '전박'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'fa_1', label: 'AP/Lat' },
    ]
};

const WRIST: XrayBodyPart = {
    id: 'wrist',
    nameEn: 'Wrist',
    nameKo: '손목',
    region: 'upper',
    sided: true,
    keywords: ['손목', 'wrist', '리스트', '완관절', '수근부', '수근관절'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'wr_1', label: 'AP/Lat' },
        { id: 'wr_2', label: 'AP/Lat + Scaphoid View (Ulnar Deviation)' },
        { id: 'wr_3', label: 'AP/Lat + Carpal Tunnel View' },
        { id: 'wr_4', label: 'AP/Lat + Both Oblique' },
        { id: 'wr_5', label: 'AP/Lat + Scaphoid + Both Oblique' },
    ]
};

const HAND: XrayBodyPart = {
    id: 'hand',
    nameEn: 'Hand',
    nameKo: '손',
    region: 'upper',
    sided: true,
    keywords: ['손', 'hand', '핸드', '수부'],
    baseView: 'AP/Oblique',
    viewOptions: [
        { id: 'hd_1', label: 'AP/Oblique' },
        { id: 'hd_2', label: 'AP/Oblique/Lat' },
        { id: 'hd_3', label: "Ball-Catcher's View (Norgaard)" },
    ]
};

const FINGER: XrayBodyPart = {
    id: 'finger',
    nameEn: 'Finger',
    nameKo: '손가락',
    region: 'upper',
    sided: true,
    keywords: ['손가락', 'finger', '핑거', '수지', '엄지손가락', '검지', '중지', '약지', '소지', '새끼손가락'],
    baseView: 'AP/Lat/Oblique',
    viewOptions: [
        { id: 'fi_1', label: 'AP/Lat/Oblique' },
        { id: 'fi_2', label: 'Thumb AP/Lat/Oblique' },
    ]
};

// ============================================================
//  LOWER EXTREMITY
// ============================================================

const HIP: XrayBodyPart = {
    id: 'hip',
    nameEn: 'Hip',
    nameKo: '고관절',
    region: 'lower',
    sided: true,
    keywords: ['고관절', '엉덩이관절', 'hip', '힙', '대퇴관절', '대퇴골두'],
    baseView: 'AP + Frog Lateral',
    viewOptions: [
        { id: 'hp_1', label: 'AP + Frog Lateral' },
        { id: 'hp_2', label: 'AP + Cross-table Lateral' },
        { id: 'hp_3', label: 'AP + Dunn View (45°)' },
        { id: 'hp_4', label: 'AP + Dunn View (90°)' },
        { id: 'hp_5', label: 'AP + Judet View (Both Obliques)' },
        { id: 'hp_6', label: 'Both Hip AP + Frog Lateral' },
    ]
};

const FEMUR: XrayBodyPart = {
    id: 'femur',
    nameEn: 'Femur',
    nameKo: '대퇴골',
    region: 'lower',
    sided: true,
    keywords: ['대퇴골', '대퇴', 'femur', '허벅지뼈', '허벅지', '넓적다리'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'fe_1', label: 'AP/Lat' },
        { id: 'fe_2', label: 'AP/Lat (Including Hip)' },
        { id: 'fe_3', label: 'AP/Lat (Including Knee)' },
    ]
};

const KNEE: XrayBodyPart = {
    id: 'knee',
    nameEn: 'Knee',
    nameKo: '무릎',
    region: 'lower',
    sided: true,
    keywords: ['무릎', 'knee', '니', '슬관절', '니관절', '무릎관절'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'kn_1', label: 'AP/Lat' },
        { id: 'kn_2', label: 'AP/Lat + Axial (Sunrise View)' },
        { id: 'kn_3', label: 'AP/Lat + Merchant View' },
        { id: 'kn_4', label: 'AP/Lat + Tunnel View (Notch View)' },
        { id: 'kn_5', label: 'AP/Lat + Skyline View' },
        { id: 'kn_6', label: 'AP/Lat + Both Oblique' },
        { id: 'kn_7', label: 'Standing AP/Lat' },
        { id: 'kn_8', label: 'Rosenberg View (WB PA 45° Flexion)' },
        { id: 'kn_9', label: 'Standing Long Leg (Scanogram)' },
        { id: 'kn_10', label: 'AP/Lat + Axial + Merchant (Full Series)' },
    ]
};

const PATELLA: XrayBodyPart = {
    id: 'patella',
    nameEn: 'Patella',
    nameKo: '슬개골',
    region: 'lower',
    sided: true,
    keywords: ['슬개골', '무릎뼈', 'patella', '파텔라', '무릎앞', '빠떼라'],
    baseView: 'Axial View',
    viewOptions: [
        { id: 'pa_1', label: 'Axial View (Sunrise)' },
        { id: 'pa_2', label: 'Merchant View' },
        { id: 'pa_3', label: 'Skyline View' },
        { id: 'pa_4', label: 'Knee AP/Lat + Axial View' },
    ]
};

const LOWER_LEG: XrayBodyPart = {
    id: 'lower_leg',
    nameEn: 'Tibia/Fibula',
    nameKo: '하퇴',
    region: 'lower',
    sided: true,
    keywords: ['하퇴', '종아리', 'tibia', 'fibula', '경골', '비골', '정강이', '하퇴부'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'll_1', label: 'AP/Lat' },
        { id: 'll_2', label: 'AP/Lat (Including Knee)' },
        { id: 'll_3', label: 'AP/Lat (Including Ankle)' },
    ]
};

const ANKLE: XrayBodyPart = {
    id: 'ankle',
    nameEn: 'Ankle',
    nameKo: '발목',
    region: 'lower',
    sided: true,
    keywords: ['발목', 'ankle', '앵클', '족관절', '발목관절'],
    baseView: 'AP/Lat',
    viewOptions: [
        { id: 'an_1', label: 'AP/Lat' },
        { id: 'an_2', label: 'AP/Lat + Mortise View' },
        { id: 'an_3', label: 'AP/Lat + Stress View (Inversion/Eversion)' },
        { id: 'an_4', label: 'AP/Lat + Both Oblique' },
        { id: 'an_5', label: 'AP/Lat + Mortise + Stress (Full Series)' },
    ]
};

const FOOT: XrayBodyPart = {
    id: 'foot',
    nameEn: 'Foot',
    nameKo: '발',
    region: 'lower',
    sided: true,
    keywords: ['발', 'foot', '풋', '족부', '발바닥'],
    baseView: 'AP/Oblique/Lat',
    viewOptions: [
        { id: 'ft_1', label: 'AP/Oblique/Lat' },
        { id: 'ft_2', label: 'Weight-bearing AP/Lat' },
        { id: 'ft_3', label: 'Calcaneal Axial View (Harris)' },
        { id: 'ft_4', label: 'Sesamoid View' },
        { id: 'ft_5', label: 'AP/Oblique/Lat + Calcaneal Axial' },
    ]
};

const TOE: XrayBodyPart = {
    id: 'toe',
    nameEn: 'Toe',
    nameKo: '발가락',
    region: 'lower',
    sided: true,
    keywords: ['발가락', 'toe', '토', '족지', '엄지발가락', '새끼발가락'],
    baseView: 'AP/Lat/Oblique',
    viewOptions: [
        { id: 'to_1', label: 'AP/Lat/Oblique' },
        { id: 'to_2', label: 'Great Toe AP/Lat (Sesamoid)' },
    ]
};

// ============================================================
//  TRUNK REGION
// ============================================================

const PELVIS: XrayBodyPart = {
    id: 'pelvis',
    nameEn: 'Pelvis',
    nameKo: '골반',
    region: 'trunk',
    sided: false,
    keywords: ['골반', 'pelvis', '펠비스', '골반뼈', '장골'],
    baseView: 'AP',
    viewOptions: [
        { id: 'pv_1', label: 'AP' },
        { id: 'pv_2', label: 'AP + Inlet/Outlet View' },
        { id: 'pv_3', label: 'AP + Judet View (Both Obliques)' },
        { id: 'pv_4', label: 'AP + Both Hip Frog Lateral' },
        { id: 'pv_5', label: 'AP + Standing (Flamingo View)' },
        { id: 'pv_6', label: 'Pelvis AP + Coccyx AP/Lat' },
    ]
};

const CHEST: XrayBodyPart = {
    id: 'chest',
    nameEn: 'Chest',
    nameKo: '흉부',
    region: 'trunk',
    sided: false,
    keywords: ['흉부', '가슴', 'chest', '체스트', '폐', '흉곽'],
    baseView: 'PA',
    viewOptions: [
        { id: 'ch_1', label: 'PA' },
        { id: 'ch_2', label: 'PA + Lat' },
        { id: 'ch_3', label: 'PA + Both Oblique' },
    ]
};

const RIB: XrayBodyPart = {
    id: 'rib',
    nameEn: 'Rib',
    nameKo: '늑골',
    region: 'trunk',
    sided: true,
    keywords: ['늑골', '갈비뼈', 'rib', '리브', '갈비'],
    baseView: 'AP + Oblique',
    viewOptions: [
        { id: 'rb_1', label: 'AP + Oblique' },
        { id: 'rb_2', label: 'AP + Both Oblique (Rib Series)' },
        { id: 'rb_3', label: 'AP + Oblique + Chest PA' },
    ]
};

const SKULL: XrayBodyPart = {
    id: 'skull',
    nameEn: 'Skull',
    nameKo: '두개골',
    region: 'trunk',
    sided: false,
    keywords: ['두개골', '머리뼈', 'skull', '스컬', '두부', '머리'],
    baseView: 'AP + Both Lat',
    viewOptions: [
        { id: 'sk_1', label: 'AP + Both Lat' },
        { id: 'sk_2', label: "AP + Lat + Towne's View" },
        { id: 'sk_3', label: "AP + Lat + Water's View (Sinuses)" },
    ]
};

// ============================================================
//  SPECIAL VIEWS
// ============================================================

const STANDING_LONG_LEG: XrayBodyPart = {
    id: 'standing_long_leg',
    nameEn: 'Standing Long Leg',
    nameKo: '하지전장',
    region: 'special',
    sided: false,
    keywords: ['하지전장', '스캐노그램', '롱레그', 'scanogram', 'long leg', '하지길이', '다리전체', '다리길이'],
    baseView: 'Standing Both Leg Full Length',
    viewOptions: [
        { id: 'sll_1', label: 'Standing Both Leg Full Length AP' },
        { id: 'sll_2', label: 'Standing Both Leg Full Length AP + Lat' },
    ]
};

const SI_JOINT: XrayBodyPart = {
    id: 'si_joint',
    nameEn: 'SI Joint',
    nameKo: '천장관절',
    region: 'special',
    sided: false,
    keywords: ['천장관절', '에스아이', 'si joint', 'si관절', '엉치엉덩관절'],
    baseView: 'Ferguson View',
    viewOptions: [
        { id: 'si_1', label: 'Ferguson View (AP Tilted 30°)' },
        { id: 'si_2', label: 'Pelvis AP + Ferguson View' },
        { id: 'si_3', label: 'Both Oblique (SI Joint View)' },
    ]
};

// ============================================================
//  EXPORT: Complete list of all body parts
// ============================================================

export const XRAY_BODY_PARTS: XrayBodyPart[] = [
    // Spine
    CSPINE, TSPINE, LSPINE, SACRUM, WHOLE_SPINE,
    // Upper Extremity
    SHOULDER, CLAVICLE, SCAPULA, HUMERUS, ELBOW, FOREARM, WRIST, HAND, FINGER,
    // Lower Extremity
    HIP, FEMUR, KNEE, PATELLA, LOWER_LEG, ANKLE, FOOT, TOE,
    // Trunk
    PELVIS, CHEST, RIB, SKULL,
    // Special
    STANDING_LONG_LEG, SI_JOINT,
];

// ============================================================
//  VOICE DETECTION ENGINE
// ============================================================

/** Side keywords for voice detection */
const SIDE_KEYWORDS: { keywords: string[]; side: 'Lt' | 'Rt' | 'Both' }[] = [
    { keywords: ['왼', '좌', '왼쪽', '좌측', '레프트', 'left', 'lt'], side: 'Lt' },
    { keywords: ['오른', '우', '오른쪽', '우측', '라이트', 'right', 'rt'], side: 'Rt' },
    { keywords: ['양쪽', '양', '양측', '바이', 'both', 'bilateral'], side: 'Both' },
];

/** X-ray trigger keywords */
const XRAY_TRIGGERS = [
    'xray', 'x-ray', 'x ray', '엑스레이', 'x레이', '방사선', '촬영',
    '찍어', '찍자', '찍어줘', '사진', '엑레', '엑스레', '엑쓰레이',
];

export interface XrayDetectionResult {
    bodyPart: XrayBodyPart;
    side: 'Lt' | 'Rt' | 'Both' | null;
}

/**
 * Detect X-ray command from voice/text input.
 * Returns matched body part and side, or null if no match.
 */
export function detectXrayCommand(text: string): XrayDetectionResult | null {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();

    // Check if text contains an X-ray trigger keyword
    const hasXrayTrigger = XRAY_TRIGGERS.some(trigger => normalized.includes(trigger));
    if (!hasXrayTrigger) return null;

    // Detect side
    let detectedSide: 'Lt' | 'Rt' | 'Both' | null = null;
    for (const sideGroup of SIDE_KEYWORDS) {
        if (sideGroup.keywords.some(k => normalized.includes(k))) {
            detectedSide = sideGroup.side;
            break;
        }
    }

    // Detect body part (find best match by keyword count)
    let bestMatch: XrayBodyPart | null = null;
    let bestScore = 0;

    for (const part of XRAY_BODY_PARTS) {
        let score = 0;
        for (const keyword of part.keywords) {
            if (normalized.includes(keyword.toLowerCase())) {
                // Longer keyword matches get higher score
                score += keyword.length;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = part;
        }
    }

    if (!bestMatch) return null;

    // If body part requires sides but none detected, default to null (will ask user)
    if (!bestMatch.sided) {
        detectedSide = null;
    }

    return {
        bodyPart: bestMatch,
        side: detectedSide,
    };
}

/**
 * Build the final X-ray order text from selection.
 */
export function buildXrayOrderText(
    bodyPart: XrayBodyPart,
    viewOption: XrayViewOption,
    side: 'Lt' | 'Rt' | 'Both' | null
): string {
    if (side && bodyPart.sided) {
        return `${side} ${bodyPart.nameEn} ${viewOption.label}`;
    }
    return `${bodyPart.nameEn} ${viewOption.label}`;
}

/**
 * Get body parts by region for organized display.
 */
export function getBodyPartsByRegion(): Record<string, XrayBodyPart[]> {
    const regionLabels: Record<string, string> = {
        spine: '척추 (Spine)',
        upper: '상지 (Upper Extremity)',
        lower: '하지 (Lower Extremity)',
        trunk: '체간 (Trunk)',
        special: '특수 촬영 (Special)',
    };

    const grouped: Record<string, XrayBodyPart[]> = {};
    for (const part of XRAY_BODY_PARTS) {
        const label = regionLabels[part.region] || part.region;
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(part);
    }
    return grouped;
}
