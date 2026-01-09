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
    { id: 'r_hd', text: 'Hand AP / Finger Lat', type: 'sided' },

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
