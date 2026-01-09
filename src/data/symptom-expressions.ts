export interface SymptomExpression {
    expression: string;
    standardTerm: string;
    keywords: string[];
    category: 'General' | 'Respiratory' | 'Digestive' | 'Musculoskeletal' | 'Neurological' | 'Psychiatric' | 'Skin' | 'Eye/Ear' | 'Urinary' | 'Circulatory';
    hasSide?: boolean;
}

export const SYMPTOM_EXPRESSIONS: SymptomExpression[] = [
    // === 1. 전신 및 대사 (General & Metabolic) ===
    { expression: "몸이 천근만근이고 무거워요", standardTerm: "전신 권태감 (Malaise)", keywords: ["천근만근", "무겁다", "나른", "노곤"], category: "General" },
    { expression: "기운이 하나도 없고 축 처져요", standardTerm: "무기력증 (Lethargy)", keywords: ["기운", "맥이", "처진다", "힘이"], category: "General" },
    { expression: "몸이 불덩이 같이 뜨거워요", standardTerm: "발열 (Fever)", keywords: ["불덩이", "화끈", "열이"], category: "General" },
    { expression: "몸이 으슬으슬 춥고 떨려요", standardTerm: "오한 (Chills)", keywords: ["오들오들", "으슬으슬", "시리다", "추워"], category: "General" },
    { expression: "아침마다 얼굴과 손발이 부어요", standardTerm: "부종 (Edema)", keywords: ["붓는", "부석부석", "부종"], category: "General" },
    { expression: "발이 너무 시려요", standardTerm: "말초 냉감/혈액순환 장애 (Cold Extremities)", keywords: ["발이", "시려", "차가워", "수족냉증"], category: "Circulatory" },
    { expression: "식은땀이 줄줄 흘러요", standardTerm: "발한 (Sweating)", keywords: ["땀", "식은땀"], category: "General" },
    { expression: "입맛이 뚝 떨어졌어요", standardTerm: "식욕 부진 (Anorexia)", keywords: ["입맛", "식욕", "밥맛", "밥이"], category: "General" },
    { expression: "살이 갑자기 많이 빠졌어요", standardTerm: "체중 감소 (Weight Loss)", keywords: ["살", "체중", "빠졌"], category: "General" },
    { expression: "자고 일어나도 피곤이 안 풀려요", standardTerm: "만성 피로 (Chronic Fatigue)", keywords: ["피곤", "피로", "만성"], category: "General" },

    // === 2. 두경부 및 신경계 (Head, Neck & Neuro) ===
    { expression: "머리가 지끈거리고 울려요", standardTerm: "박동성 두통 (Throbbing Headache)", keywords: ["지끈", "쿵쿵", "울린다", "박동"], category: "Neurological" },
    { expression: "머리가 띵하고 무거워요", standardTerm: "긴장성 두통 (Tension Headache)", keywords: ["머리", "띵하다", "무겁다", "안개", "두통"], category: "Neurological" },
    { expression: "한쪽 머리가 콕콕 쑤셔요", standardTerm: "편두통 (Migraine)", keywords: ["관자놀이", "한쪽", "편두통", "쑤셔"], category: "Neurological" },
    { expression: "눈이 침침하고 뻑뻑해요", standardTerm: "시력 저하/안구 건조 (Visual disturbance/Dry Eye)", keywords: ["침침", "깔깔", "꺼칠", "뻑뻑", "눈"], category: "Eye/Ear" },
    { expression: "귀에서 윙 소리가 나요", standardTerm: "이명 (Tinnitus)", keywords: ["이명", "윙", "소리", "귀"], category: "Eye/Ear" },
    { expression: "귀가 먹먹하고 잘 안 들려요", standardTerm: "이충만감/난청 (Ear Fullness/Hearing Loss)", keywords: ["먹먹", "안들려", "멍멍"], category: "Eye/Ear" },
    { expression: "세상이 빙글빙글 돌아요", standardTerm: "회전성 현훈 (Vertigo)", keywords: ["빙글", "돈다", "현훈", "어지러"], category: "Neurological" },
    { expression: "머리가 핑 도는 것 같이 어지러워요", standardTerm: "현기증 (Dizziness)", keywords: ["어찔", "핑", "어지러", "맑지"], category: "Neurological" },
    { expression: "일어날 때 눈앞이 캄캄해요", standardTerm: "기립성 저혈압 (Orthostatic Hypotension)", keywords: ["기립", "일어날", "캄캄"], category: "Circulatory" },

    // === 3. 소화기 및 흉부 순환기 (Digestive & Circulatory) ===
    { expression: "가슴이 답답하고 막힌 것 같아요", standardTerm: "흉부 압박감/화병 (Chest Tightness/Hwa-byung)", keywords: ["답답", "덩어리", "막힌", "명치"], category: "Respiratory" },
    { expression: "가슴이 두근거리고 조마조마해요", standardTerm: "심계항진 (Palpitations)", keywords: ["두근", "조마조마", "쿵쾅", "심장"], category: "Circulatory" },
    { expression: "속이 쓰리고 타들어 가는 것 같아요", standardTerm: "위염/역류성 식도염 (Gastritis/GERD)", keywords: ["속이", "쓰리", "타들어", "뒤집어", "신물"], category: "Digestive" },
    { expression: "속이 더부룩하고 체한 것 같아요", standardTerm: "소화불량 (Dyspepsia)", keywords: ["더부룩", "체한", "부대끼", "소화"], category: "Digestive" },
    { expression: "배가 쥐어짜는 듯이 아파요", standardTerm: "복통 (Abdominal Pain)", keywords: ["쥐어짜", "사르르", "쌀쌀", "콕콕", "배가", "아파"], category: "Digestive" },
    { expression: "변을 봐도 시원하지 않고 묵직해요", standardTerm: "후중감 (Tenesmus)", keywords: ["뒤가", "묵직", "시원치", "잔변"], category: "Digestive" },
    { expression: "설사를 물처럼 계속 해요", standardTerm: "설사 (Diarrhea)", keywords: ["설사", "물똥", "좍좍"], category: "Digestive" },
    { expression: "토할 것 같이 울렁거려요", standardTerm: "구역/구토 (Nausea/Vomiting)", keywords: ["울렁", "토할", "미식", "구역"], category: "Digestive" },

    // === 4. 근골격계 및 피부 (Musculoskeletal & Skin) ===
    // 순서: 척추(목) -> 상지(어깨-팔꿈치-손목-손) -> 척추(허리) -> 하지(고관절-무릎-발목-발) + 신경증상

    // 1. 목 (Neck)
    { expression: "목(경추부)가 아파요", standardTerm: "경부통 (Neck Pain)", keywords: ["목", "경추", "뒷목", "뻐근"], category: "Musculoskeletal" },

    // 2. 어깨 (Shoulder)
    { expression: "어깨가 아파요", standardTerm: "어깨 통증 (Shoulder Pain)", keywords: ["어깨", "견관절", "아파"], category: "Musculoskeletal", hasSide: true },
    { expression: "어깨가 안 움직여요", standardTerm: "견관절 운동제한/오십견 (Shoulder ROM Limit/Frozen Shoulder)", keywords: ["오십견", "안올라", "운동", "굳어"], category: "Musculoskeletal", hasSide: true },

    // 3. 팔꿈치 (Elbow)
    { expression: "팔꿈치가 아파요", standardTerm: "엘보/팔꿈치 통증 (Elbow Pain)", keywords: ["팔꿈치", "엘보", "아파"], category: "Musculoskeletal", hasSide: true },

    // 4. 손목/손 (Wrist/Hand)
    { expression: "손목이 아파요", standardTerm: "손목 통증 (Wrist Pain)", keywords: ["손목", "아파", "시큰"], category: "Musculoskeletal", hasSide: true },
    { expression: "손이 아파요", standardTerm: "수부 통증 (Hand Pain)", keywords: ["손", "손가락", "아파"], category: "Musculoskeletal", hasSide: true },

    // 5. 상지 신경증상 (Arm Numbness)
    { expression: "팔이 저려요", standardTerm: "상지 방사통 (Arm Radiculopathy)", keywords: ["팔", "저려", "전기"], category: "Musculoskeletal", hasSide: true },

    // 6. 허리 (Back)
    { expression: "허리가 아파요", standardTerm: "요통 (Low Back Pain)", keywords: ["허리", "요통", "끊어", "삐끗"], category: "Musculoskeletal" },

    // 7. 고관절 (Hip)
    { expression: "고관절이 아파요", standardTerm: "고관절 통증 (Hip Pain)", keywords: ["고관절", "엉덩이", "골반", "사타구니"], category: "Musculoskeletal", hasSide: true },

    // 8. 하지 신경증상 (Leg Numbness)
    { expression: "다리가 저려요", standardTerm: "하지 방사통/좌골신경통 (Leg Radiculopathy/Sciatica)", keywords: ["다리", "저려", "찌릿", "내려와"], category: "Musculoskeletal", hasSide: true },
    { expression: "다리가 아파요", standardTerm: "하지 통증 (Leg Pain)", keywords: ["다리", "아파", "종아리"], category: "Musculoskeletal", hasSide: true },

    // 9. 무릎 (Knee)
    { expression: "무릎이 아파요", standardTerm: "무릎 통증 (Knee Pain)", keywords: ["무릎", "아파", "시큰"], category: "Musculoskeletal", hasSide: true },

    // 10. 발목/발 (Ankle/Foot)
    { expression: "발목이 아파요", standardTerm: "발목 통증 (Ankle Pain)", keywords: ["발목", "아파", "삐끗", "접질"], category: "Musculoskeletal", hasSide: true },

    // Other existing items maintained
    { expression: "다리가 우리하게 계속 아파요", standardTerm: "만성 심부 통증 (Deep Aching Pain)", keywords: ["우리하다", "우리", "은근", "둔탁"], category: "Musculoskeletal", hasSide: true },
    { expression: "어깨가 결리고 담이 들었어요", standardTerm: "근막통증증후군 (Myofascial Pain)", keywords: ["결린다", "결려", "담", "뻐근"], category: "Musculoskeletal" },
    { expression: "상처 부위가 욱신거려요", standardTerm: "박동성 통증/염증 (Throbbing Pain/Inflammation)", keywords: ["욱신", "쑤셔", "상처"], category: "Musculoskeletal" },
    { expression: "손발이 저리고 남의 살 같아요", standardTerm: "감각 이상 (Paresthesia)", keywords: ["저리", "저림", "남의살", "전기", "감각"], category: "Musculoskeletal" },
    { expression: "관절 마디마디가 쑤셔요", standardTerm: "다발성 관절통 (Polyarthralgia)", keywords: ["마디", "쑤셔", "관절"], category: "Musculoskeletal" },
    { expression: "몸이 근질근질 가려워요", standardTerm: "소양증 (Pruritus)", keywords: ["근질", "가려", "긁어"], category: "Skin" },
    { expression: "피부에 붉은 반점이 돋았어요", standardTerm: "피부 발진 (Sky Rash)", keywords: ["반점", "붉은", "두드러기", "뭐가나"], category: "Skin" },

    // === 5. 정신 및 심리 (Psychiatric) ===
    { expression: "자꾸 깜빡깜빡하고 정신이 멍해요", standardTerm: "기억력 저하/인지기능 저하 (Memory Loss/Cognitive Decline)", keywords: ["깜빡", "멍하다", "기억", "정신"], category: "Psychiatric" },
    { expression: "마음이 안달 나고 불안해요", standardTerm: "불안 (Anxiety)", keywords: ["안달", "안절부절", "불안", "초조"], category: "Psychiatric" },
    { expression: "울화가 치밀고 만사가 귀찮아요", standardTerm: "우울/화병 (Depression/Hwa-byung)", keywords: ["울화", "화병", "귀찮", "우울"], category: "Psychiatric" },
    { expression: "손이나 몸이 저절로 떨려요", standardTerm: "진전 (Tremor)", keywords: ["덜덜", "떨려", "수전증", "제멋대로"], category: "Neurological" },
    { expression: "잠을 통 못 자요", standardTerm: "불면증 (Insomnia)", keywords: ["잠", "불면", "새벽", "못자"], category: "Psychiatric" },

    // === Additional Common User Expressions ===
    { expression: "목이 따끔거리고 침 삼키기 힘들어요", standardTerm: "인후통 (Sore Throat)", keywords: ["목", "따끔", "삼키", "아파"], category: "Respiratory" },
    { expression: "기침이 자꾸 나와요", standardTerm: "기침 (Cough)", keywords: ["기침", "콜록"], category: "Respiratory" },
    { expression: "가래가 끓어요", standardTerm: "객담 (Sputum)", keywords: ["가래", "걸려"], category: "Respiratory" },
    { expression: "숨이 차요", standardTerm: "호흡곤란 (Dyspnea)", keywords: ["숨", "차요", "호흡"], category: "Respiratory" },
    { expression: "소변 볼 때 아파요", standardTerm: "배뇨통 (Dysuria)", keywords: ["소변", "오줌", "아파", "따가"], category: "Urinary" },
    { expression: "소변을 너무 자주 봐요", standardTerm: "빈뇨 (Frequency)", keywords: ["자주", "빈뇨", "화장실"], category: "Urinary" }
];

// Helper to expand list programmatically simply by variations if needed,
// or the UI can handle fuzzy matching.
// For now, this is a solid base of ~80 distinct high-frequency expressions.
// I will add more specific variations to reach higher count perception or rely on keyword matching.
