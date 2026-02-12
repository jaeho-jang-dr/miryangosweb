# 자료실 Content 포맷 규칙

자료실(articles)에 등록하는 모든 자료는 아래 포맷을 **반드시** 준수해야 합니다.

## content 필드 구조 (3단계)

```markdown
![제목](썸네일_URL)

[슬라이드 목차]
1. 첫 번째 슬라이드 제목
2. 두 번째 슬라이드 제목
3. 세 번째 슬라이드 제목
...

[전체 내용]
[슬라이드 1]
첫 번째 슬라이드 텍스트...

[슬라이드 2]
두 번째 슬라이드 텍스트...
```

### 1. 첫 슬라이드 이미지 (필수)
- PDF 1페이지를 PNG 썸네일로 생성 (PyMuPDF/fitz 사용)
- `public/uploads/` 에 저장
- content 최상단에 마크다운 이미지로 삽입: `![제목](/uploads/파일명_thumb.png)`
- 파일명 형식: `noterang_{YYYYMMDD_HHMMSS}_{uuid8}_{제목}_thumb.png`

### 2. 슬라이드 목차 (필수)
- `[슬라이드 목차]` 헤더 아래에 번호 매긴 슬라이드 제목 리스트
- PDF 각 페이지에서 가장 큰 글씨를 제목으로 추출
- 형식: `1. 슬라이드 제목 (60자 이내)`

### 3. 전체 내용 (필수)
- `[전체 내용]` 헤더 아래에 슬라이드별 텍스트
- 각 슬라이드는 `[슬라이드 N]` 구분자로 분리
- 최대 8000자 (초과 시 `... (이하 생략)`)
- NotebookLM 언급, OCR 아티팩트 자동 제거

## 적용 파이프라인

| 파이프라인 | 파일 | 포맷 적용 위치 |
|---|---|---|
| noterang run_pipeline | `apps/noterang/run_pipeline.py` | `register_to_firestore()` |
| notebooklm-automation | `apps/notebooklm-automation/.../firestore_client.py` | `register_article()` |
| nlm_to_web (구) | `apps/nlm_to_web/nlm_to_web.py` | `generate_thumbnail_and_format_content()` |

## 검증

```bash
# 자료 포맷 검사
python scripts/find_bad_articles.py

# 자료 수정 (dry-run)
python scripts/fix_articles.py

# 자료 수정 (실제 적용)
python scripts/fix_articles.py --apply
```
