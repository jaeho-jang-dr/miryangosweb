#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 멀티파트 파이프라인: 하나의 노트북에서 여러 부의 슬라이드를 생성

Usage:
    python run_multipart.py
"""
import asyncio
import json
import os
import re
import shutil
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# .env.local 로드
try:
    from dotenv import load_dotenv
    for p in [Path(__file__).parent / '.env.local',
              Path("D:/Projects/notebooklm-automation/.env.local")]:
        if p.exists():
            load_dotenv(p)
            break
except ImportError:
    pass

sys.path.insert(0, str(Path(__file__).parent))

from noterang import Noterang, WorkflowResult, get_config
from noterang.prompts import SlidePrompts
from run_pipeline import NoterangPipeline, PDFAnalyzer

WEBAPP_DIR = Path("D:/Projects/miryangosweb")
UPLOADS_DIR = WEBAPP_DIR / "public" / "uploads"
FIREBASE_PROJECT_ID = "miryangosweb"


async def run_multipart_pipeline(
    notebook_title: str,
    parts: List[Dict[str, Any]],
    research_queries: List[str],
    article_type: str = "disease",
):
    """
    하나의 노트북에서 여러 부의 슬라이드를 생성하는 멀티파트 파이프라인

    Args:
        notebook_title: 노트북 제목 (= Firestore 그룹핑 title)
        parts: [{"subtitle": "1부: 손목골절", "design": "클레이 3D", "slides": 15, "focus": "..."}]
        research_queries: 연구 검색 쿼리 (전체 공유)
        article_type: Firestore article type
    """
    start_time = time.time()
    config = get_config()
    noterang = Noterang(config=config)
    prompts = SlidePrompts()
    results = []

    print("\n" + "=" * 60)
    print(f"  노트랑 멀티파트 파이프라인")
    print(f"  노트북: {notebook_title}")
    print(f"  총 {len(parts)}부 생성")
    print("=" * 60)

    for i, part in enumerate(parts, 1):
        part_start = time.time()
        subtitle = part["subtitle"]
        design = part["design"]
        slides = part.get("slides", 15)
        focus_topic = part["focus"]

        print(f"\n{'='*60}")
        print(f"  [{i}/{len(parts)}] {subtitle}")
        print(f"  디자인: {design} | 슬라이드: {slides}장")
        print(f"{'='*60}")

        # 디자인 프롬프트 생성
        design_prompt = prompts.get_prompt(design) or ""
        focus_prompt = f"""{design_prompt}

[추가 요청사항]
- 반드시 한글로 작성해주세요
- 영어는 의학 전문용어만 괄호 안에 최소한으로 병기
- 환자도 이해할 수 있는 쉽고 친근한 표현 사용
- 한의학/한방/침/뜸 관련 내용 완전히 제외
- 정형외과 관점에서만 설명
- 슬라이드 {slides}장으로 구성
- 핵심 주제: {focus_topic}
- 구성: 정의 → 원인/위험인자 → 증상 → 진단 → 치료법 → 예방/재활"""

        # Step 1: 노트랑 실행 (첫 번째는 소스 수집 포함, 이후는 건너뛰기)
        skip_research = (i > 1)
        queries = research_queries if not skip_research else None

        print(f"\n[Step 1] NotebookLM {'슬라이드 생성' if skip_research else '소스 수집 + 슬라이드 생성'}...")
        nr_result = await noterang.run(
            title=notebook_title,
            research_queries=queries,
            focus=focus_prompt,
            language="ko",
            skip_research=skip_research,
            skip_convert=True,
        )

        if not nr_result.success or not nr_result.pdf_path:
            print(f"  ❌ {subtitle} 실패: {nr_result.error}")
            results.append({"success": False, "subtitle": subtitle, "error": nr_result.error})
            continue

        pdf_path = Path(nr_result.pdf_path)
        print(f"  ✓ PDF: {pdf_path.name}")

        # Step 2: PDF 분석
        print(f"\n[Step 2] PDF 분석...")
        analyzer = PDFAnalyzer(pdf_path)
        try:
            analysis = analyzer.analyze()
            analysis["thumbnail"] = analyzer.generate_thumbnail(0)
        finally:
            analyzer.close()

        # Step 3: 웹앱에 파일 복사
        print(f"\n[Step 3] 웹앱에 파일 복사...")
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = uuid.uuid4().hex[:8]
        safe_title = notebook_title.replace(" ", "_").replace("/", "-")
        safe_sub = subtitle.replace(" ", "_").replace("/", "-").replace(":", "")

        pdf_name = f"noterang_{timestamp}_{unique_id}_{safe_title}_{safe_sub}.pdf"
        pdf_dest = UPLOADS_DIR / pdf_name
        shutil.copy2(str(pdf_path), str(pdf_dest))
        pdf_url = f"/uploads/{pdf_name}"
        print(f"  PDF: {pdf_dest}")

        thumb_url = None
        if analysis.get("thumbnail"):
            thumb_name = f"noterang_{timestamp}_{unique_id}_{safe_title}_{safe_sub}_thumb.png"
            thumb_dest = UPLOADS_DIR / thumb_name
            thumb_dest.write_bytes(analysis["thumbnail"])
            thumb_url = f"/uploads/{thumb_name}"
            print(f"  썸네일: {thumb_dest}")

        # Step 4: Firestore 등록 (title은 동일 → 그룹핑)
        print(f"\n[Step 4] 자료실 등록...")
        doc_id = register_multipart_article(
            notebook_title=notebook_title,
            subtitle=subtitle,
            pdf_url=pdf_url,
            thumb_url=thumb_url,
            analysis=analysis,
            design=design,
            article_type=article_type,
            part_index=i,
            total_parts=len(parts),
        )

        elapsed = int(time.time() - part_start)
        print(f"\n  ✓ {subtitle} 완료 ({elapsed}초)")

        results.append({
            "success": doc_id is not None,
            "subtitle": subtitle,
            "doc_id": doc_id,
            "pdf_url": pdf_url,
            "duration": elapsed,
        })

    # 최종 결과
    total_elapsed = int(time.time() - start_time)
    print(f"\n{'='*60}")
    print(f"  멀티파트 파이프라인 완료 ({total_elapsed}초)")
    print(f"{'='*60}")
    for r in results:
        status = "✓" if r["success"] else "❌"
        print(f"  {status} {r['subtitle']}: {r.get('doc_id', r.get('error', ''))}")
    print(f"{'='*60}")

    return results


def register_multipart_article(
    notebook_title: str,
    subtitle: str,
    pdf_url: str,
    thumb_url: Optional[str],
    analysis: Dict[str, Any],
    design: str,
    article_type: str = "disease",
    part_index: int = 1,
    total_parts: int = 1,
) -> Optional[str]:
    """멀티파트 자료를 Firestore에 등록 (동일 title로 그룹핑)"""
    import firebase_admin
    from firebase_admin import firestore as fs_admin

    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
        print("  Firebase Admin 초기화 완료")

    db = fs_admin.client()

    # 슬라이드 제목 추출 (OCR 폴백)
    titles = analysis.get("titles", [])
    if not titles:
        content = analysis.get("content", "")
        matches = re.findall(r'\[슬라이드\s*\d+\]\s*\n(.+?)(?:\n|$)', content)
        titles = [m.strip() for m in matches if len(m.strip()) >= 2]

    # summary: "1부: 손목골절 - 슬라이드제목1 / 슬라이드제목2 / ..."
    if titles:
        title_summary = " / ".join(titles[:6])
        summary = f"{subtitle} - {title_summary}"
        if len(titles) > 6:
            summary += f" 외 {len(titles) - 6}장"
    else:
        summary = f"{subtitle}에 대해 알기 쉽게 정리한 슬라이드 자료입니다."

    # summary_text (목차)
    summary_text = ""
    if titles:
        summary_text = "\n".join(f"{j}. {t[:60]}" for j, t in enumerate(titles, 1))

    # content: 이미지 + 목차 + 전체내용
    content_parts = []
    if thumb_url:
        content_parts.append(f"![{notebook_title} {subtitle}]({thumb_url})\n")
    if summary_text:
        content_parts.append(f"\n[슬라이드 목차]\n{summary_text}\n")

    full_content = analysis.get("content", "")
    if full_content:
        if len(full_content) > 8000:
            full_content = full_content[:8000] + "\n\n... (이하 생략)"
        content_parts.append(f"\n[전체 내용]\n{full_content}")

    # 태그
    design_tag = design.replace(" ", "")
    tags = ["노트랑", design_tag, f"{part_index}부"]

    # 부위 키워드
    from run_pipeline import BODY_PARTS, match_body_part
    keywords = analysis.get("keywords", [])
    body_part = match_body_part(keywords, subtitle)
    if body_part != "etc":
        part_info = next((p for p in BODY_PARTS if p["id"] == body_part), None)
        if part_info:
            tags.append(part_info["label"])

    for kw in keywords[:5]:
        if kw not in tags and len(kw) >= 2:
            tags.append(kw)

    # createdAt 조정: 1부가 가장 최근 (왼쪽에 표시되도록)
    # part_index가 작을수록 더 최근
    from datetime import timezone, timedelta
    base_time = datetime.now(timezone.utc)
    adjusted_time = base_time - timedelta(seconds=(part_index - 1) * 30)

    doc_data = {
        'title': notebook_title,  # 동일 title → 그룹핑
        'type': article_type,
        'tags': tags,
        'summary': summary[:200],
        'content': "\n".join(content_parts),
        'attachmentUrl': pdf_url,
        'attachmentName': Path(pdf_url).name,
        'images': [],
        'isVisible': True,
        'createdAt': adjusted_time,
    }

    try:
        _, doc_ref = db.collection('articles').add(doc_data)
        doc_id = doc_ref.id
        print(f"  자료실 등록 완료: {doc_id}")
        return doc_id
    except Exception as e:
        print(f"  Firestore 등록 실패: {e}")
        return None


# ─── 메인 ─────────────────────────────────────────────
if __name__ == "__main__":
    # 노년기 골절 3부작
    NOTEBOOK_TITLE = "노년기 골절"

    RESEARCH_QUERIES = [
        "노년기 골절 손목골절 원골 원위부 골절 원인 증상 치료 예방 정형외과 -한의학 -한방 -침 -뜸",
        "노년기 척추압박골절 골다공증성 척추 골절 원인 증상 치료 시멘트성형술 -한의학 -한방",
        "노년기 고관절 골절 대퇴골 경부 골절 전자간 골절 원인 수술 재활 -한의학 -한방",
        "노인 골절 골다공증 예방 낙상 방지 비타민D 칼슘 운동 재활 -한의학 -한방",
    ]

    PARTS = [
        {
            "subtitle": "1부: 손목골절",
            "design": "클레이 3D",
            "slides": 15,
            "focus": "노년기 손목골절 (원위요골 골절, Colles' fracture, Smith's fracture). "
                     "노인에서 넘어질 때 손을 짚으면서 발생하는 손목 골절의 원인, 골다공증과의 관계, "
                     "증상(통증, 부종, 변형), 진단(X-ray, CT), "
                     "치료법(석고고정, 수술-금속판 고정), 재활운동, 예방법(낙상 방지, 골다공증 치료)",
        },
        {
            "subtitle": "2부: 척추압박골절",
            "design": "인포그래픽",
            "slides": 15,
            "focus": "노년기 척추압박골절 (골다공증성 척추 압박골절, Vertebral Compression Fracture). "
                     "기침이나 가벼운 충격에도 발생하는 척추 압박골절의 원인, 골다공증과의 관계, "
                     "증상(요통, 키 감소, 등 굽음), 진단(X-ray, MRI, 골밀도검사), "
                     "치료법(보존치료-보조기/약물, 시멘트성형술-척추체성형술/풍선확장술), "
                     "예방법(골다공증 약물, 비타민D, 운동)",
        },
        {
            "subtitle": "3부: 고관절 대퇴골 골절",
            "design": "메디컬 케어",
            "slides": 15,
            "focus": "노년기 고관절 골절 (대퇴골 경부 골절, 대퇴골 전자간 골절, Hip Fracture). "
                     "노인에서 가장 위험한 골절, 낙상으로 인한 고관절 골절의 원인, "
                     "증상(통증, 다리 회전, 보행 불가), 진단(X-ray, MRI), "
                     "치료법(반치환술, 인공관절 전치환술, 골수정 고정술), "
                     "수술 후 재활(조기 보행, 근력강화), 합병증(폐렴, 심부정맥혈전증), "
                     "예방법(낙상 방지, 골다공증 치료, 환경개선)",
        },
    ]

    results = asyncio.run(run_multipart_pipeline(
        notebook_title=NOTEBOOK_TITLE,
        parts=PARTS,
        research_queries=RESEARCH_QUERIES,
        article_type="disease",
    ))

    # JSON 결과 출력
    print(f"\nRESULT:{json.dumps(results, ensure_ascii=False)}")
    sys.exit(0 if all(r["success"] for r in results) else 1)
