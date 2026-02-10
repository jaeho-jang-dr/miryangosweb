#!/usr/bin/env python3
"""
nlm_to_web.py - NotebookLM → 웹사이트 자동 등록 파이프라인

Usage:
    # 전체 파이프라인 (NLM 리서치 → 슬라이드 생성 → 다운로드 → 분석 → 업로드)
    python apps/nlm_to_web/nlm_to_web.py --topic "족저근막염 치료법"

    # 기존 파일만 업로드
    python apps/nlm_to_web/nlm_to_web.py --file "temp/slides.pdf"

    # 옵션
    --type slide_deck|report     아티팩트 유형 (기본: slide_deck)
    --mode fast|deep             리서치 모드 (기본: fast)
    --language ko|en             언어 (기본: ko)
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
import time

# ── Windows cp949 인코딩 문제 방지 ──────────────────────────
if sys.platform == "win32" and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ── 경로 설정 ───────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
UPLOAD_SCRIPT = os.path.join(SCRIPT_DIR, "upload_article.mjs")
TEMP_DIR = os.path.join(PROJECT_ROOT, "temp")


def step(num, total, msg, end=""):
    """진행 상황 출력"""
    prefix = f"[{num}/{total}]"
    if end:
        print(f"  {prefix} {msg} {end}")
    else:
        print(f"  {prefix} {msg}", end="", flush=True)


def step_ok(detail=""):
    """단계 성공"""
    if detail:
        print(f"  ✓ ({detail})")
    else:
        print("  ✓")


def step_fail(detail=""):
    """단계 실패"""
    if detail:
        print(f"  ✗ ({detail})")
    else:
        print("  ✗")


# ── 1. NLM 인증 ────────────────────────────────────────────
def load_nlm_client():
    """notebooklm_tools 클라이언트 초기화 (캐시된 쿠키 사용)"""
    from notebooklm_tools.core.auth import load_cached_tokens
    from notebooklm_tools.core.client import NotebookLMClient

    tokens = load_cached_tokens()
    if not tokens:
        print("\n  [오류] NLM 인증 정보가 없습니다.")
        print("  → 'nlm login' 명령을 실행하세요.")
        sys.exit(1)

    client = NotebookLMClient(
        cookies=tokens.cookies,
        csrf_token=tokens.csrf_token,
        session_id=tokens.session_id,
    )
    return client


# ── 2~7. NLM 파이프라인 ────────────────────────────────────
def run_nlm_pipeline(topic, artifact_type="slide_deck", mode="fast", language="ko"):
    """NotebookLM에서 리서치 → 아티팩트 생성 → 다운로드"""

    total = 9

    # Step 1: 인증
    step(1, total, "인증 확인 중...")
    client = load_nlm_client()
    step_ok()

    try:
        # Step 2: 노트북 생성
        step(2, total, f'노트북 생성: "{topic}"...')
        notebook = client.create_notebook(title=f"[Auto] {topic}")
        if not notebook:
            step_fail()
            print("  [오류] 노트북 생성 실패")
            sys.exit(1)
        notebook_id = notebook.id
        step_ok(f"id={notebook_id[:8]}...")

        # Step 3: 웹 리서치
        step(3, total, f"웹 리서치 중 (mode={mode})...")
        research = client.start_research(
            notebook_id=notebook_id,
            query=f"{topic} (한의학, 한방, 침술, 한약 등 전통 한의학 관련 자료 제외, 현대 의학 근거 기반 자료만 포함)",
            source="web",
            mode=mode,
        )
        if not research:
            step_fail()
            print("  [오류] 리서치 시작 실패")
            sys.exit(1)

        task_id = research.get("task_id")

        # 리서치 완료 대기
        timeout = 300 if mode == "deep" else 120
        start_time = time.time()
        result = None
        while time.time() - start_time < timeout:
            result = client.poll_research(notebook_id, target_task_id=task_id)
            if result and result.get("status") == "completed":
                break
            time.sleep(10)
        else:
            step_fail("타임아웃")
            print(f"  [오류] 리서치 {timeout}초 타임아웃. 다시 시도하세요.")
            sys.exit(1)

        sources = result.get("sources", [])
        elapsed = int(time.time() - start_time)
        step_ok(f"{len(sources)}개 소스, {elapsed}초")

        # 한의학 관련 소스 필터링
        EXCLUDE_KEYWORDS = [
            "한의학", "한방", "한의원", "한약", "침술", "침치료",
            "경락", "경혈", "한의사", "동의보감", "사상체질",
            "추나", "부항", "뜸", "약침", "봉침",
        ]
        before_count = len(sources)
        sources = [
            s for s in sources
            if not any(
                kw in (s.get("title", "") + s.get("url", ""))
                for kw in EXCLUDE_KEYWORDS
            )
        ]
        excluded = before_count - len(sources)
        if excluded:
            print(f"  [필터] 한의학 관련 {excluded}개 소스 제외")

        # Step 4: 소스 가져오기 (배치 처리 - 타임아웃 방지)
        step(4, total, f"소스 {len(sources)}개 가져오기...")
        if sources:
            imported = []
            batch_size = 3
            for i in range(0, len(sources), batch_size):
                batch = sources[i : i + batch_size]
                try:
                    batch_imported = client.import_research_sources(
                        notebook_id=notebook_id,
                        task_id=task_id,
                        sources=batch,
                    )
                    imported.extend(batch_imported)
                except Exception as e:
                    print(f"\n  [경고] 배치 {i // batch_size + 1} 가져오기 실패: {e}")
                time.sleep(2)
            step_ok(f"{len(imported)}개 가져옴")
        else:
            step_ok("소스 없음")

        # Step 5: 아티팩트 생성 요청
        slide_focus = (
            "가능한 한 영어 사용을 줄이고 한글로 작성해주세요. "
            "의학 용어는 한글(영어) 형태로 병기하되 한글 중심으로 표현하세요. "
            "Claymorphism(클레이 3D) 스타일의 친근한 비주얼로 구성하고, "
            "너무 심각하지 않게 일반인도 쉽게 이해할 수 있는 가벼운 톤으로 만들어주세요. "
            "약 15장 분량의 슬라이드로 충분히 상세하게 구성해주세요."
        )

        if artifact_type == "report":
            step(5, total, "리포트 생성 요청...")
            artifact = client.create_report(
                notebook_id=notebook_id,
                language=language,
                focus_prompt=slide_focus,
            )
        else:
            step(5, total, "슬라이드 생성 요청...")
            artifact = client.create_slide_deck(
                notebook_id=notebook_id,
                language=language,
                focus_prompt=slide_focus,
            )

        if not artifact:
            step_fail()
            print("  [오류] 아티팩트 생성 요청 실패")
            sys.exit(1)

        artifact_id = artifact.get("artifact_id")
        step_ok(f"id={artifact_id[:8]}...")

        # Step 6: 생성 대기 (인증 만료 시 자동 재인증)
        step(6, total, "아티팩트 생성 대기...")
        gen_timeout = 600  # 10분
        gen_start = time.time()
        ready = False
        while time.time() - gen_start < gen_timeout:
            try:
                artifacts = client.get_studio_status(notebook_id)
            except Exception as e:
                if "Authentication" in str(e) or "expired" in str(e):
                    # 인증 만료 → 재인증 후 재시도
                    client.close()
                    client = load_nlm_client()
                    time.sleep(5)
                    continue
                raise
            for a in artifacts:
                if a.get("artifact_id") == artifact_id:
                    status = a.get("status", "")
                    if status == "completed":
                        ready = True
                        break
                    elif status == "failed":
                        step_fail("생성 실패")
                        print("  [오류] 아티팩트 생성 실패")
                        sys.exit(1)
            if ready:
                break
            time.sleep(15)
        else:
            step_fail("타임아웃")
            print("  [오류] 아티팩트 생성 10분 타임아웃")
            sys.exit(1)

        elapsed = int(time.time() - gen_start)
        step_ok(f"{elapsed}초")

        # Step 7: 다운로드
        step(7, total, "파일 다운로드 중...")
        os.makedirs(TEMP_DIR, exist_ok=True)
        ext = "md" if artifact_type == "report" else "pdf"
        output_path = os.path.join(TEMP_DIR, f"nlm_{int(time.time())}.{ext}")

        if artifact_type == "report":
            dl_path = asyncio.run(
                client.download_report(notebook_id, output_path, artifact_id)
            )
        else:
            dl_path = asyncio.run(
                client.download_slide_deck(notebook_id, output_path, artifact_id)
            )

        step_ok(os.path.basename(dl_path))

        return dl_path

    finally:
        client.close()


# ── 8. PDF 분석 (독립형 - 웹앱 불필요) ──────────────────────
def run_analyze_file(file_path):
    """analyze_pdf 모듈로 직접 분석 (localhost 불필요)"""
    from analyze_pdf import analyze_file as _analyze

    try:
        return _analyze(file_path)
    except Exception as e:
        print(f"\n  [오류] 분석 실패: {e}")
        return None


# ── 9. Firebase 업로드 ──────────────────────────────────────
def upload_to_firebase(file_path, analysis):
    """node upload_article.mjs 호출"""

    cmd = [
        "node", UPLOAD_SCRIPT,
        "--file", file_path,
        "--title", analysis.get("title", ""),
        "--type", analysis.get("category", "disease"),
        "--tags", ",".join(analysis.get("tags", [])),
        "--summary", analysis.get("summary", ""),
        "--content", analysis.get("content", ""),
        "--analyzedBy", analysis.get("analyzedBy", ""),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=PROJECT_ROOT,
        )
    except subprocess.TimeoutExpired:
        print("  [오류] Firebase 업로드 타임아웃 (60초)")
        return None
    except Exception as e:
        print(f"  [오류] 업로드 실행 실패: {e}")
        return None

    if result.returncode != 0:
        print(f"  [오류] 업로드 실패: {result.stderr.strip()}")
        return None

    # stdout에서 JSON 파싱
    stdout = result.stdout.strip()
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        print(f"  [오류] 업로드 결과 파싱 실패: {stdout}")
        return None


# ── 메인 ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="NotebookLM → 웹사이트 자동 등록"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--topic", help="리서치할 주제 (전체 파이프라인)")
    group.add_argument("--file", help="이미 다운받은 PDF/PPTX 파일 경로 (업로드만)")

    parser.add_argument(
        "--type",
        choices=["slide_deck", "report"],
        default="slide_deck",
        help="아티팩트 유형 (기본: slide_deck)",
    )
    parser.add_argument(
        "--mode",
        choices=["fast", "deep"],
        default="fast",
        help="리서치 모드 (기본: fast)",
    )
    parser.add_argument(
        "--language",
        choices=["ko", "en"],
        default="ko",
        help="언어 (기본: ko)",
    )

    args = parser.parse_args()

    print()
    print("=" * 50)
    print("  NotebookLM → 웹사이트 자동 등록")
    print("=" * 50)

    total = 9

    if args.topic:
        # 전체 파이프라인: Step 1~7
        file_path = run_nlm_pipeline(
            topic=args.topic,
            artifact_type=args.type,
            mode=args.mode,
            language=args.language,
        )
    else:
        # --file 모드: 기존 파일 사용
        file_path = os.path.abspath(args.file)
        if not os.path.exists(file_path):
            print(f"  [오류] 파일을 찾을 수 없습니다: {file_path}")
            sys.exit(1)
        print(f"  [파일 모드] {os.path.basename(file_path)}")
        print(f"  단계 1~7 건너뜀 (기존 파일 사용)")

    # Step 8: PDF 분석
    step(8, total, "Vision OCR 분석 중...")
    analysis = run_analyze_file(file_path)
    if analysis:
        step_ok(f'{analysis.get("title", "")[:30]}')
    else:
        # 분석 실패 시 기본값으로 진행
        print("  [경고] 분석 실패, 기본값으로 진행")
        analysis = {
            "title": os.path.basename(file_path).replace(".pdf", "").replace(".pptx", ""),
            "category": "disease",
            "tags": ["자동등록"],
            "summary": "자동 등록된 자료입니다.",
            "content": "## 내용\n\n자동 등록된 자료입니다. 파일을 확인해주세요.",
            "analyzedBy": "기본값",
        }

    # Step 9: Firebase 업로드
    step(9, total, "웹사이트 등록 중...")
    upload_result = upload_to_firebase(file_path, analysis)
    if upload_result:
        step_ok()
    else:
        step_fail()
        # 분석 결과라도 JSON으로 저장
        fallback_path = os.path.join(TEMP_DIR, f"analysis_{int(time.time())}.json")
        os.makedirs(TEMP_DIR, exist_ok=True)
        with open(fallback_path, "w", encoding="utf-8") as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        print(f"  [!] 분석 결과를 저장했습니다: {fallback_path}")
        sys.exit(1)

    # 완료 요약
    print()
    print("=" * 50)
    print("  완료! 자료가 웹사이트에 등록되었습니다.")
    print(f'  - 제목: {analysis.get("title", "")}')
    print(f'  - 문서 ID: {upload_result.get("docId", "")}')
    print(f'  - 태그: {", ".join(analysis.get("tags", []))}')
    print(f'  - URL: {upload_result.get("url", "")}')
    print("=" * 50)
    print()


if __name__ == "__main__":
    main()
