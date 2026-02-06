# Conductor Integration for Noterang

## Agent Overview

**Name**: Noterang (노트랑)
**Type**: 글로벌 에이전트 스킬 (프로젝트 상위 레벨)
**Scope**: DevEnvironment 하위 모든 프로젝트에서 사용 가능
**Purpose**: Google NotebookLM 완전 제어

### 중요: 한글 우선 정책
> **모든 아티팩트 생성 시 `language="ko"` 필수!**

```python
mcp__notebooklm__studio_create(
    notebook_id="...",
    artifact_type="slide_deck",
    language="ko",  # 항상 포함!
    confirm=True
)
```

### 프로젝트 위치
```
D:/Entertainments/DevEnvironment/notebooklm/   # 메인 프로젝트 디렉토리
├── noterang/                                   # 에이전트 코드
├── NOTEBOOKLM_AUTOMATION.md                    # 자동화 가이드
├── downloads/                                  # 다운로드 폴더
└── (스크립트들)
```

## Conductor Memory Instructions

Conductor는 이 에이전트를 다음과 같이 기억하고 활용해야 합니다:

### 1. 언제 Noterang을 사용하는가

다음 상황에서 Noterang을 자동으로 호출:
- 사용자가 "노트북LM", "NotebookLM", "노트랑" 언급 시
- 연구 자료 정리가 필요할 때
- AI 콘텐츠 생성이 필요할 때 (인포그래픽, 오디오, 슬라이드 등)
- 문서/웹페이지를 분석하고 요약해야 할 때
- 팟캐스트나 프레젠테이션이 필요할 때

### 2. Noterang의 주요 워크플로우

#### 워크플로우 1: 연구 자료 수집 및 분석
```
1. 새 노트북 생성 (주제명)
2. 관련 URL/파일 소스 추가
3. 노트북에 질문하여 인사이트 추출
4. 결과를 D:/Entertainments/DevEnvironment/notebooklm/ 에 저장
```

#### 워크플로우 2: 콘텐츠 자동 생성
```
1. 기존 노트북 선택 (또는 최신 노트북 사용)
2. 원하는 아티팩트 생성 (인포그래픽/오디오/슬라이드/퀴즈)
3. NotebookLM에서 생성 완료 대기
4. 다운로드 링크 제공
```

#### 워크플로우 3: 자동 연구 시스템
```
1. 연구 주제 입력
2. 자동으로 관련 소스 검색 및 추가
3. AI 분석 및 요약
4. 최종 보고서 생성
```

### 3. Conductor 호출 예시

```python
# Example 1: 최신 노트북으로 인포그래픽 생성
conductor.execute_skill("noterang", {
    "action": "create_infographic",
    "notebook": "latest"
})

# Example 2: 새 연구 프로젝트 시작
conductor.execute_skill("noterang", {
    "action": "create_and_populate",
    "title": "AI 영상 제작 연구",
    "sources": ["url1", "url2", "file1.pdf"]
})

# Example 3: 노트북 질의
conductor.execute_skill("noterang", {
    "action": "query",
    "notebook_id": "abc123",
    "question": "핵심 인사이트는?"
})
```

### 4. 결과 저장 및 기억

Conductor는 Noterang의 모든 작업 결과를 다음 위치에 저장:
```
D:/Entertainments/DevEnvironment/notebooklm/
```

저장되는 정보:
- 생성된 아티팩트 메타데이터 (JSON)
- 질의응답 기록 (JSONL)
- 노트북 목록 스냅샷
- 다운로드된 콘텐츠

### 5. 다른 프로젝트에서 사용

Noterang은 notebooklm 프로젝트 내에 있어 모든 프로젝트에서 사용 가능:

```
D:/Entertainments/DevEnvironment/notebooklm/noterang/
```

다른 프로젝트에서 import:
```python
import sys
sys.path.append("D:/Entertainments/DevEnvironment/notebooklm")

from noterang import NoterangAgent

agent = NoterangAgent()
```

### 6. Conductor 자동화 규칙

Conductor는 다음 패턴을 인식하고 자동으로 Noterang 실행:

| 사용자 입력 | Conductor 액션 | language |
|------------|---------------|----------|
| "연구 자료 정리해줘" | 새 노트북 생성 + 소스 추가 | - |
| "이거 요약해줘" | NotebookLM에 추가 + 쿼리 | ko |
| "팟캐스트 만들어줘" | 오디오 생성 | **ko** |
| "프레젠테이션 필요해" | 슬라이드 생성 | **ko** |
| "인포그래픽으로 보여줘" | 인포그래픽 생성 | **ko** |
| "퀴즈 만들어줘" | 퀴즈 생성 | **ko** |
| "플래시카드 만들어줘" | 플래시카드 생성 | **ko** |

> **모든 콘텐츠 생성 시 `language="ko"` 자동 적용!**

### 7. 상태 추적

Conductor는 Noterang의 상태를 추적:
- 마지막 사용한 노트북 ID
- 생성 중인 아티팩트 목록
- 실패한 작업 (재시도 필요)
- 사용 통계

### 8. 에러 처리

Noterang 에러 발생 시 Conductor의 대응:

1. **인증 에러**: 자동으로 `notebooklm-mcp-auth` 실행 안내
2. **네트워크 에러**: 3번 재시도 후 사용자에게 알림
3. **생성 실패**: NotebookLM 웹 링크 제공
4. **다운로드 실패**: 웹에서 수동 다운로드 안내

### 9. 성능 최적화

- 노트북 목록은 5분마다 캐싱
- 인증 토큰은 자동 갱신
- 대량 작업은 비동기 처리
- 결과는 로컬에 저장하여 재사용

### 10. 보안 및 개인정보

- 인증 정보는 `~/.notebooklm-mcp-cli/auth.json`에 암호화 저장
- 생성된 콘텐츠는 로컬에만 저장
- Google 계정 정보는 절대 로그에 기록하지 않음

## nlm_to_web 서브에이전틱 스킬 (검증 완료 2026-02-06)

### 개요
NotebookLM PDF를 miryangosweb 자료실에 등록하는 End-to-End 스킬.
2가지 모드: **Full Pipeline** (노트북 생성부터) / **PDF-Only** (기존 PDF 등록).

### 검증된 워크플로우 (3건 연속 성공)

| 항목 | 값 |
|------|-----|
| 아킬레스건염 | 15슬라이드, 20소스, 707초, `iUsBGEJQUI6M6EPGQ8GT` |
| 족모지통풍관절염 | 15슬라이드, 26소스, 676초, `74GDt4g9inyJUMujGkh0` |
| 무릎 골연화증 | 15슬라이드, 29소스, 743초, `KXE1QVIJQhh1TgXfmX83` |

### Full Pipeline 워크플로우
```
[1/4] NotebookLM 슬라이드 생성
      ├── 인증 확인 (자동 2FA TOTP)
      ├── 노트북 생성/재사용
      ├── 연구 소스 수집 (3 쿼리 × ~10소스 = 20-30개)
      │   └── 한의학/한방 자동 제외 필터
      ├── 슬라이드 생성 (500-600초 소요, timeout=600 필수!)
      └── PDF 다운로드 (API → Playwright fallback)

[2/4] PDF 분석
      ├── PyMuPDF 텍스트 추출 시도
      ├── Vision OCR 폴백 (NotebookLM PDF는 이미지 기반, 항상 발동)
      ├── 키워드 추출 + 부위 자동 판별
      └── 첫 페이지 썸네일 PNG 생성

[3/4] 웹앱 파일 복사
      ├── PDF → public/uploads/noterang_YYYYMMDD_HHMMSS_{title}.pdf
      └── 썸네일 → public/uploads/noterang_YYYYMMDD_HHMMSS_{title}_thumb.png

[4/4] Firestore 자료실 등록
      ├── content: 첫 페이지 이미지 markdown + 슬라이드 목차 + 전체 텍스트
      ├── tags: 자동생성 + 노트랑 + 디자인명 + 부위 + 키워드
      ├── images: [] (중복 방지, content에 이미 포함)
      └── NotebookLM/한글정형외과 언급 제거됨
```

### 콘텐츠 정리 규칙
- `NotebookLM AI가 생성한...` 줄 → **삭제**
- `{디자인} 디자인 / 한글 / 정형외과 관점` 줄 → **삭제**
- 첫 페이지 이미지 → `![제목](thumb_url)` 마크다운으로 content 최상단 배치
- `images` 배열 → 빈 배열 `[]` (content markdown에서 렌더링하므로 중복 방지)

### 핵심 설정값
```yaml
timeout_slides: 600        # 300은 부족! 500-600초 소요됨
design: "미니멀 젠"        # 검증된 디자인 (100개 중 ID:1)
language: "ko"             # 필수
ocr: "Vision API"          # NotebookLM PDF는 이미지 기반
avg_duration: 710초        # 풀 파이프라인 평균
avg_sources: 25개          # 3 쿼리 합계
slide_count: 15장          # 프롬프트에서 15장 지정
```

### CLI 사용법
```bash
# Full Pipeline (노트북 생성 → 자료실 등록)
python run_pipeline.py --title "아킬레스건염" --design "미니멀 젠"

# PDF-Only (기존 PDF → 자료실 등록, 5-10초)
python nlm_to_web.py --pdf "G:/내 드라이브/notebooklm/slides.pdf" --title "오십견"
python nlm_to_web.py --latest --title "족저근막염"

# 비공개 등록
python run_pipeline.py --title "제목" --design "미니멀 젠" --hidden

# 여러 주제 순차 실행 (한 번에 하나씩)
for title in "아킬레스건염" "통풍" "골연화증"; do
    python run_pipeline.py --title "$title" --design "미니멀 젠"
done
```

### Conductor 트리거
| 키워드 | 스킬 |
|--------|------|
| `nlm_to_web`, `자료실 등록`, `pdf 등록`, `웹에 등록` | nlm_to_web (PDF-Only) |
| `노트랑`, `슬라이드 만들어`, `ppt 만들어`, `노트북 만들어` | full_pipeline |

### 에러 대응 (실전 경험)
| 문제 | 원인 | 해결 |
|------|------|------|
| 슬라이드 타임아웃 | timeout_slides=300 부족 | **600으로 증가** |
| PyMuPDF 텍스트 0자 | NotebookLM PDF는 이미지 기반 | **Vision OCR 자동 폴백** |
| API 다운로드 실패 | slide_deck not ready | **Playwright fallback** |
| config.py TypeError | noterang_config.json에 미지 키 | **from_dict에서 unknown key 필터링** |
| regenerate 소스 없음 | 노트북 ID 잘림 | **전체 UUID 사용 필요** |

### 파일 구조
```
D:/Projects/miryangosweb/apps/noterang/
├── run_pipeline.py          # Full Pipeline 스크립트
├── nlm_to_web.py            # PDF-Only 스킬 스크립트
├── noterang_config.json     # 설정 (timeout_slides=600)
└── noterang/
    ├── skill.json           # 스킬 메타데이터 (v2.0.0)
    ├── CONDUCTOR.md          # 이 문서
    ├── config.py            # 설정 로더 (unknown key 필터)
    ├── prompts.py           # 100개 디자인 프롬프트
    └── slide_prompts.json   # 디자인 데이터
```

## Integration Checklist

- [x] Agent 코드 작성
- [x] Skill 메타데이터 정의
- [x] 작업 디렉토리 설정
- [x] README 문서화
- [x] Conductor 통합 가이드
- [x] 상위 디렉토리 배치
- [x] nlm_to_web 스킬 구현
- [x] NoterangIntegration.ts 연동
- [x] 실전 검증 (3건 연속 성공)
- [x] 콘텐츠 정리 규칙 적용
- [x] 에러 대응 문서화
