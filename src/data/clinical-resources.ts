// --- 1. TESTS (RADIOLOGY, LAB, ULTRASOUND) ---
export const TEST_GROUPS = [
    {
        id: 'radiology',
        label: '방사선 검사',
        items: [
            { id: 'r_c', text: 'C-Spine AP/Lat', type: 'simple' },
            { id: 'r_l', text: 'L-Spine AP/Lat', type: 'simple' },
            { id: 'r_sh', text: 'Shoulder AP/Lat', type: 'sided' },
            { id: 'r_kn', text: 'Knee AP/Lat', type: 'sided' },
            { id: 'r_an', text: 'Ankle AP/Lat', type: 'sided' },
        ]
    },
    {
        id: 'ultrasound',
        label: '초음파 검사',
        items: [
            { id: 'u_msk', text: '근골격계 초음파', type: 'sided' },
            { id: 'u_abd', text: '상복부 초음파', type: 'simple' },
        ]
    },
    {
        id: 'lab',
        label: '혈액/진단검사',
        items: [
            { id: 'l1', text: 'CBC + CRP + Uric Acid' },
            { id: 'l2', text: 'Rheumatoid Factor Set' },
            { id: 'l3', text: 'UA (Urinalysis)' },
        ]
    }
];

// --- 2. SPECIAL PROCEDURES (INJECTIONS) ---
export const PROCEDURE_GROUPS = [
    {
        id: 'joint_inj',
        label: '관절강내 주사',
        items: [
            { id: 'ji1', text: '관절강내 주사 (히알루론산)', subType: 'sided' },
            { id: 'ji2', text: '관절강내 주사 (콘쥬란)', subType: 'sided' },
        ]
    },
    {
        id: 'tendon_inj',
        label: '건초강내 주사',
        items: [
            { id: 'ti1', text: '건초강내 주사 (Triam)', subType: 'sided' },
            { id: 'ti2', text: '프롤로 주사 (Prolotherapy)', subType: 'sided' },
        ]
    },
    {
        id: 'nerve_inj',
        label: '신경강내 주사',
        items: [
            { id: 'ni1', text: '경막외 차단술 (Caudal)', subType: 'simple' },
            { id: 'ni2', text: '선택적 신경 차단술 (Root Block)', subType: 'sided' },
        ]
    },
    {
        id: 'tpi',
        label: 'TPI (통증유발점)',
        items: [
            { id: 'tpi1', text: 'TPI (근막동통유발점 주사)', subType: 'dosage_1_2_3' },
        ]
    }
];

// --- 3. MEDICATION & IM (MUSCLE INJ) ---
export const MEDICATION_GROUPS = [
    {
        id: 'muscle_inj',
        label: '근육 주사 (IM)',
        items: [
            { id: 'mi1', text: 'Diclofenac 1A', subType: 'dosage_1_2' },
            { id: 'mi2', text: 'Tramadol 1A', subType: 'dosage_1_2' },
            { id: 'mi3', text: 'Gentamicin 1A', subType: 'dosage_1_2' },
        ]
    },
    {
        id: 'iv_inj',
        label: '정맥 주사 (IV)',
        items: [
            { id: 'iv1', text: '하이코민 1A + 5% D/W 100cc iv' },
            { id: 'iv2', text: '파노펜 1B iv' },
            { id: 'iv3', text: '5% D/W 100cc iv' },
            { id: 'iv4', text: '파메론 1A + 5% D/W 100cc iv' },
            { id: 'iv5', text: '본드론 1A + 5% D/W 100cc iv' },
        ]
    },
    {
        id: 'po_meds',
        label: '경구약 (PO)',
        items: [
            { id: 'po1', text: '정형1 (근골격계 기본)' },
            { id: 'po2', text: '정형2 (강력 소염진통)' },
            { id: 'po3', text: '위장보호제 세트' },
        ]
    }
];

// --- 4. PHYSICAL THERAPY ---
export const PT_GROUPS = [
    {
        id: 'pt_standard',
        label: '기본 물리치료',
        items: [
            { id: 'pt1', text: '표층열치료 (Hot Pack)' },
            { id: 'pt2', text: '경피신경자극 (TENS)' },
            { id: 'pt3', text: '간섭파전류 (ICT)' },
            { id: 'pt4', text: '심층열치료 (Ultrasound)' },
        ]
    },
    {
        id: 'pt_special',
        label: '특수/재활치료',
        items: [
            { id: 'pt10', text: '체외충격파 (ESWT)' },
            { id: 'pt11', text: '도수치료 (Manual)' },
            { id: 'pt12', text: '경추견인 (C-Traction)' },
            { id: 'pt13', text: '요추견인 (L-Traction)' },
        ]
    },
    {
        id: 'pt_sets',
        label: '물리치료세트',
        items: [
            { id: 'set_tens', text: 'Hot Pack + Ultrasound + TENS' },
            { id: 'set_ict', text: 'Hot Pack + Ultrasound + ICT' },
            { id: 'set_c_trac', text: 'Hot Pack + Ultrasound + TENS + Cervical Traction' },
            { id: 'set_p_trac', text: 'Hot Pack + Ultrasound + TENS + Pelvic Traction' },
            { id: 'set_rom', text: 'Hot Pack + Ultrasound + TENS + ROM exercise' },
        ]
    }
];

// --- 5. SURGICAL (TRAUMA) ---
export const SURGICAL_GROUPS = [
    {
        id: 'trauma_basic',
        label: '일반 처치',
        items: [
            { id: 's1', text: '단순 처치 (Dressing)' },
            { id: 's2', text: '염증성 처치' },
            { id: 's3', text: '화상 처치' },
        ]
    },
    {
        id: 'trauma_complex',
        label: '외과적 수술/봉합',
        items: [
            { id: 's10', text: '단순 봉합 (Suture)' },
            { id: 's11', text: '창상절제 및 봉합' },
            { id: 's12', text: '변연절제술 (Debridement)' },
            { id: 's13', text: '이물제거술' },
            { id: 's14', text: '소종양적출술' },
        ]
    }
];

export const SYMPTOMS = [

    { id: 's1', category: 'IM', text: '두통 (Headache)' },
    { id: 's2', category: 'IM', text: '오한/발열 (Chills/Fever)' },
    { id: 's3', category: 'IM', text: '기침/가래 (Cough/Sputum)' },
    { id: 's4', category: 'IM', text: '콧물/코막힘 (Rhinorrhea)' },
    { id: 's5', category: 'IM', text: '인후통 (Sore Throat)' },
    { id: 's6', category: 'OS', text: '요통 (Low Back Pain)' },
    { id: 's7', category: 'OS', text: '경부통 (Neck Pain)' },
    { id: 's8', category: 'OS', text: '무릎 통증 (Knee Pain)' },
    { id: 's9', category: 'OS', text: '어깨 통증 (Shoulder Pain)' },
    { id: 's10', category: 'IM', text: '소화불량 (Dyspepsia)' },
    { id: 's11', category: 'IM', text: '복통 (Abdominal Pain)' },
    { id: 's12', category: 'IM', text: '설사 (Diarrhea)' },
];

export const RADIOLOGY_LIST = [
    // Spine
    { id: 'r_c', text: 'C-Spine AP/Lat', type: 'simple', subOptions: ['Both Oblique'] },
    { id: 'r_l', text: 'L-Spine AP/Lat', type: 'simple', subOptions: ['Both Oblique'] },
    { id: 'r_t', text: 'T-Spine AP/Lat', type: 'simple' },
    { id: 'r_w', text: 'Whole Spine AP/Lat', type: 'simple' },

    // Pelvis/Hip
    { id: 'r_p1', text: 'Pelvis AP + Coccyx AP/Lat', type: 'simple' },
    { id: 'r_p2', text: 'Pelvis AP + Both Hip Axial', type: 'simple' },
    { id: 'r_h1', text: 'Total Hip View + Both Hip Axial', type: 'simple' },

    // Skull
    { id: 'r_s', text: 'Skull AP + Both Lat', type: 'simple' },

    // Extremities (Sided)
    { id: 'r_sh', text: 'Shoulder AP/Lat', type: 'sided' },
    { id: 'r_cl', text: 'Clavicle AP + 45 Tilt View', type: 'sided' },
    { id: 'r_el', text: 'Elbow AP/Lat', type: 'sided', subOptions: ['Both Oblique'] },
    { id: 'r_wr', text: 'Wrist AP/Lat', type: 'sided', subOptions: ['Both Oblique'] },
    { id: 'r_hd', text: 'Hand AP / Oblique', type: 'sided', subOptions: ['Finger Lat'] },

    // Lower Extremities (Sided)
    { id: 'r_kn', text: 'Knee AP/Lat', type: 'sided', subOptions: ['Patella Axial', 'Merchant', 'Skyline', 'Tunnel', 'Both Oblique'] },
    { id: 'r_an', text: 'Ankle AP/Lat', type: 'sided', subOptions: ['Mortise View'] },
    { id: 'r_ft', text: 'Foot AP/Oblique', type: 'sided', subOptions: ['Toe Lat'] },

    // Other
    { id: 'r7', text: 'Chest PA', type: 'simple' },
    { id: 'r8', text: 'Rib Series', type: 'sided' },
    { id: 'u1', text: 'Musculoskeletal Ultrasound', type: 'sided' },
];

export const LAB_LIST = [
    { id: 'l1', text: 'CBC + CRP + Uric Acid', category: 'Basic' },
    { id: 'l2', text: 'CBC + RA Factor + ASO', category: 'Arthritis' },
    { id: 'l3', text: 'LFT (Liver Function Test)', category: 'Organ' },
    { id: 'l4', text: 'Thyroid Function Test (Basic)', category: 'Organ' },
    { id: 'l5', text: 'CBC + Blood Sugar', category: 'Basic' },
    { id: 'l6', text: 'Lipid Panel', category: 'Organ' },
    { id: 'l7', text: 'UA (Urinalysis)', category: 'Basic' },
    { id: 'l8', text: 'Influenza Ag Test', category: 'Infection' },
];

export type PrescriptionItem = {
    id: string;
    text: string;
    category: string;
    subType?: 'sided' | 'dosage_1_2' | 'dosage_1_2_3' | 'options'; // For specific UI logic
    options?: string[]; // For custom dosage/options
    defaultDosage?: string;
};

export const PRESCRIPTION_CATEGORIES = [
    { id: 'nerve_joint', label: '신경/관절주사' },
    { id: 'im', label: 'IM' },
    { id: 'po', label: 'PO' },
    { id: 'iv_nut', label: '혈관/영양주사' },
    { id: 'nerve_block', label: '선택신경차단술' },
    { id: 'surgical', label: '외과적치료' },
    { id: 'splint_cast', label: '부목/석고' },
    { id: 'brace', label: '보조/보호대' },
];

export const PRESCRIPTION_LIST: PrescriptionItem[] = [
    // 1. 신경/관절주사
    { id: 'nj1', category: 'nerve_joint', text: '미골경막외주사 (Caudal block)', subType: 'sided' },
    { id: 'nj2', category: 'nerve_joint', text: '관절주사 (Joint Injection)', subType: 'sided' },
    { id: 'nj3', category: 'nerve_joint', text: '연골주사 (Hyaluronic Acid)', subType: 'sided' },
    { id: 'nj4', category: 'nerve_joint', text: 'PN주사 (Polynucleotide)', subType: 'sided' },

    // 2. IM
    { id: 'im1', category: 'im', text: 'Gentamycin 1A', subType: 'dosage_1_2' },
    { id: 'im2', category: 'im', text: 'Amikacin 1A' },
    { id: 'im3', category: 'im', text: 'Tramadol 1A', subType: 'dosage_1_2' },
    { id: 'im4', category: 'im', text: 'Unikacin 1A', subType: 'dosage_1_2' },

    // 3. PO
    { id: 'po1', category: 'po', text: '정형1 (Ortho Set 1)' },
    { id: 'po2', category: 'po', text: '정형2 (Ortho Set 2)' },
    { id: 'po3', category: 'po', text: '척추1 (Spine Set 1)' },
    { id: 'po4', category: 'po', text: '척추2 (Spine Set 2)' },
    { id: 'po5', category: 'po', text: '감기약 (Cold Med)' },
    { id: 'po6', category: 'po', text: '급성통풍 (Acute Gout)' },
    { id: 'po7', category: 'po', text: '통풍약 (Chronic Gout)' },

    // 4. 혈관/영양주사
    { id: 'iv1', category: 'iv_nut', text: '하이코민 100cc iv' },
    { id: 'iv2', category: 'iv_nut', text: '파노펜 100cc iv' },
    { id: 'iv3', category: 'iv_nut', text: '닥터라민 멀티비타 파노펜' },
    { id: 'iv4', category: 'iv_nut', text: '아르믹스 멀티비타 파토펜' },

    // 5. 선택신경차단술
    { id: 'nb1', category: 'nerve_block', text: '경추 신경차단술 (Cervical Block)' },
    { id: 'nb2', category: 'nerve_block', text: '요추 신경차단술 (Lumbar Block)' },
    { id: 'nb3', category: 'nerve_block', text: '흉추 신경차단술 (Thoracic Block)' },

    // 6. 외과적치료
    { id: 'surg1', category: 'surgical', text: 'Dressing (소독)' },
    { id: 'surg2', category: 'surgical', text: 'Suture (봉합)' },
    { id: 'surg3', category: 'surgical', text: 'Dirty Dressing' },
    { id: 'surg4', category: 'surgical', text: '탄력붕대 (Elastic Bandage)', subType: 'dosage_1_2_3' },
    { id: 'surg5', category: 'surgical', text: 'Nylon 4/0' },
    { id: 'surg6', category: 'surgical', text: 'Nylon 5/0' },

    // 7. 부목/석고
    { id: 'sc1', category: 'splint_cast', text: 'Long Arm Splint', subType: 'sided' },
    { id: 'sc2', category: 'splint_cast', text: 'Sugar Tong Splint', subType: 'sided' },
    { id: 'sc3', category: 'splint_cast', text: 'Shoulder Strap Splint', subType: 'sided' },
    { id: 'sc4', category: 'splint_cast', text: 'Short Arm Splint', subType: 'sided' },
    { id: 'sc5', category: 'splint_cast', text: 'Long Arm Cast', subType: 'sided' },
    { id: 'sc6', category: 'splint_cast', text: 'Short Arm Cast', subType: 'sided' },
    { id: 'sc7', category: 'splint_cast', text: 'Thumb Spica Splint', subType: 'sided' },
    { id: 'sc8', category: 'splint_cast', text: 'Thumb Spica Cast', subType: 'sided' },
    { id: 'sc9', category: 'splint_cast', text: 'Long Leg Splint', subType: 'sided' },
    { id: 'sc10', category: 'splint_cast', text: 'Cylinder Splint', subType: 'sided' },
    { id: 'sc11', category: 'splint_cast', text: 'Short Leg Splint', subType: 'sided' },
    { id: 'sc12', category: 'splint_cast', text: 'Long Leg Cast', subType: 'sided' },
    { id: 'sc13', category: 'splint_cast', text: 'Cylindrical Cast', subType: 'sided' },
    { id: 'sc14', category: 'splint_cast', text: 'Short Leg Cast', subType: 'sided' },

    // 8. 보조/보호대
    { id: 'br1', category: 'brace', text: 'Wrist Band', subType: 'options', options: ['S', 'M', 'L', 'Uni'] },
    { id: 'br2', category: 'brace', text: 'Wrist Support', subType: 'sided' },
    { id: 'br3', category: 'brace', text: 'Ankle Band', subType: 'options', options: ['S', 'M', 'L', 'Uni'] },
    { id: 'br4', category: 'brace', text: 'Ankle Support', subType: 'sided' },
    { id: 'br5', category: 'brace', text: '복대 (Abdominal Binder)' },
    { id: 'br6', category: 'brace', text: 'Rib Belt' },
    { id: 'br7', category: 'brace', text: 'Elbow Band', subType: 'sided' },
    { id: 'br8', category: 'brace', text: 'Knee Band', subType: 'sided' },
    { id: 'br9', category: 'brace', text: 'Knee Support', subType: 'sided' },
];

export const PHYSICAL_THERAPY_LIST = [
    { id: 'pt1', text: '표층열치료 (Hot Pack)', keywords: ['핫팩', '찜질', '열치료'] },
    { id: 'pt2', text: '심층열치료 (Ultrasound)', keywords: ['초음파', '심층열'] },
    { id: 'pt3', text: '경피신경자극치료 (TENS)', keywords: ['텐스', '전기치료'] },
    { id: 'pt4', text: '간섭파전류치료 (ICT)', keywords: ['아이씨티', '간섭파'] },
    { id: 'pt5', text: '심층열치료 (MicroWave)', keywords: ['마이크로웨이브', '극초단파'] },
    { id: 'pt6', text: '단파투열치료 (ShortWave)', keywords: ['단파'] },
    { id: 'pt7', text: '파라핀욕 (Paraffin Bath)', keywords: ['파라핀'] },
    { id: 'pt8', text: '이온삼투요법 (Iontophoresis)', keywords: ['이온'] },
    { id: 'pt9', text: '체외충격파 (ESWT)', keywords: ['체외충격파', '충격파'] },
    { id: 'pt10', text: '도수치료 (Manual Therapy)', keywords: ['도수치료', '도수'] },
    { id: 'pt11', text: '신장분사치료 (Cooling Spray)', keywords: ['신장분사', '스프레이', '크라이오'] },
    { id: 'pt12', text: '경추견인 (Cervical Traction)', keywords: ['목견인', '경추견인'] },
    { id: 'pt13', text: '요추견인 (Pelvic Traction)', keywords: ['허리견인', '요추견인', '골반견인'] },
    { id: 'pt14', text: '관절가동범위훈련 (ROM exercise)', keywords: ['알오엠', '운동치료', '가동범위'] },
];

export const PHYSICAL_THERAPY_BUNDLES = [
    {
        id: 'bundle_pt_basic_tens',
        name: '기본 물리치료 (TENS)',
        items: ['Hot Pack', 'Ultrasound', 'TENS'],
        keywords: ['기본물리치료', '핫팩초음파텐스']
    },
    {
        id: 'bundle_pt_basic_ict',
        name: '기본 물리치료 (ICT)',
        items: ['Hot Pack', 'Ultrasound', 'ICT'],
        keywords: ['아이씨티세트', '핫팩초음파아이씨티']
    },
    {
        id: 'bundle_pt_c_traction',
        name: '목 견인 치료 세트',
        items: ['Hot Pack', 'Ultrasound', 'TENS', 'Cervical Traction'],
        keywords: ['목견인', '경추견인']
    },
    {
        id: 'bundle_pt_p_traction',
        name: '허리 견인 치료 세트',
        items: ['Hot Pack', 'Ultrasound', 'TENS', 'Pelvic Traction'],
        keywords: ['허리견인', '요추견인', '골반견인']
    },
    {
        id: 'bundle_pt_rom',
        name: '어깨/관절 재활 세트',
        items: ['Hot Pack', 'Ultrasound', 'TENS', 'ROM exercise'],
        keywords: ['알오엠', '운동치료', '재활치료', '어깨운동']
    },
];

