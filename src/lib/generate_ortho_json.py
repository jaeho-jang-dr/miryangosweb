import pandas as pd
import json

# === 설정: 선생님의 전문 분야 코드 범위 ===
TARGET_CHAPTER = 'M' # M: 근골격계
ADDITIONAL_CODES = ['S'] # S: 손상/외상(골절 등)도 정형외과 필수

def generate_ortho_db():
    print("🏥 정형외과 전체 데이터베이스 생성 중...")
    
    # 1. 엑셀 파일 로드 (파일명은 실제 다운받은 파일명으로 수정하세요)
    # 엑셀에 '코드', '한글명', '영문명' 컬럼이 있다고 가정
    try:
        # 엑셀 파일이 없으면 에러가 나므로 예외처리
        df = pd.read_excel('kcd_code.xlsx') 
    except FileNotFoundError:
        print("❌ 엑셀 파일이 없습니다. 더미 데이터로 구조만 생성합니다.")
        # 파일이 없을 때를 대비한 테스트용 더미 데이터
        data = {
            '코드': ['M17', 'M17.0', 'M17.1', 'M51', 'M51.0', 'M51.1', 'S52', 'S52.5'],
            '한글명': ['무릎관절증', '양쪽 원발성 무릎관절증', '기타 원발성 무릎관절증', 
                    '기타 추간판장애', '척수병증을 동반한 요추 디스크', '신경뿌리병증 동반 요추 디스크',
                    '팔뚝의 골절', '요골 하단의 골절'],
            '영문명': ['Gonarthrosis', 'Primary gonarthrosis, bilateral', 'Other primary gonarthrosis',
                    'Other intervertebral disc disorders', 'Lumbar disc with myelopathy', 'Lumbar disc with radiculopathy',
                    'Fracture of forearm', 'Fracture of lower end of radius']
        }
        df = pd.DataFrame(data)

    # 2. 정형외과 관련 코드만 필터링 (M코드 + S코드)
    # Ensure code col is string
    df['코드'] = df['코드'].astype(str)
    ortho_df = df[
        df['코드'].str.startswith(tuple([TARGET_CHAPTER] + ADDITIONAL_CODES))
    ]

    # 3. 계층 구조 생성 (대분류 -> 중분류 -> 소분류)
    # 예: M51 -> M51.1
    result_tree = {}

    for _, row in ortho_df.iterrows():
        code = str(row['코드'])
        name = row['한글명']
        
        # 메인 카테고리 (예: M51)
        # Using 3 characters for main code Mxx or Sxx
        main_code = code.split('.')[0]
        if len(main_code) > 3:
             main_code = main_code[:3]

        if main_code not in result_tree:
            result_tree[main_code] = {
                "code": main_code,
                "category_name": name if '.' not in code else name, # 임시 이름 for main category if not distinct
                "sub_diseases": []
            }
        
        # 세부 질환 추가
        result_tree[main_code]["sub_diseases"].append({
            "full_code": code,
            "korean_name": name,
            "english_name": row.get('영문명', '')
        })

    # 4. JSON 파일 저장
    final_data = {
        "metadata": {
            "department": "Orthopedics",
            "source": "KCD-8",
            "total_categories": len(result_tree)
        },
        "diseases": list(result_tree.values())
    }

    with open('src/data/ortho_all_data.json', 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 'src/data/ortho_all_data.json' 파일 생성 완료! (카테고리: {len(result_tree)}개)")

if __name__ == "__main__":
    generate_ortho_db()
