#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nlm_to_web - NotebookLM PDF → 웹 자료실 등록 스킬

이미 다운로드된 PDF를 바로 분석하여 자료실에 등록합니다.
브라우저 불필요, 수초 내 완료.

Usage:
    # PDF 경로 지정
    python nlm_to_web.py --pdf "G:/내 드라이브/notebooklm/족주상골_부골증.pdf" --title "족주상골부골증"

    # 최신 PDF 자동 선택
    python nlm_to_web.py --latest --title "족주상골부골증"

    # 옵션
    python nlm_to_web.py --pdf "path.pdf" --title "제목" --type disease --hidden
"""
import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

# .env.local 로드
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).parent / '.env.local'
    if _env_path.exists():
        load_dotenv(_env_path)
    else:
        _env_path2 = Path("D:/Projects/notebooklm-automation/.env.local")
        if _env_path2.exists():
            load_dotenv(_env_path2)
except ImportError:
    logger.debug("python-dotenv 미설치 - .env.local 파일을 수동으로 설정하세요.")

sys.path.insert(0, str(Path(__file__).parent))

from run_pipeline import NoterangPipeline

DOWNLOAD_DIR = Path("G:/내 드라이브/notebooklm")


def find_latest_pdf(directory: Path = DOWNLOAD_DIR) -> "Path | None":
    """다운로드 폴더에서 최신 PDF 파일 찾기.

    Args:
        directory: 검색할 디렉토리

    Returns:
        가장 최근 PDF 파일 경로 또는 None (디렉토리 없음/PDF 없음)
    """
    if not directory.exists():
        logger.warning("다운로드 디렉토리가 존재하지 않습니다: %s", directory)
        return None
    try:
        pdfs = sorted(directory.glob("*.pdf"), key=lambda p: p.stat().st_mtime, reverse=True)
    except OSError as e:
        logger.error("PDF 파일 목록 조회 실패 (%s): %s", directory, e)
        return None
    return pdfs[0] if pdfs else None


async def main() -> int:
    """메인 진입점.

    Returns:
        종료 코드 (0: 성공, 1: 실패)
    """
    parser = argparse.ArgumentParser(
        description="nlm_to_web: NotebookLM PDF → 웹 자료실 등록"
    )
    parser.add_argument(
        "--title", "-t", required=True,
        help="자료 제목 (예: 족주상골부골증)"
    )
    parser.add_argument(
        "--pdf", "-p",
        help="PDF 파일 경로"
    )
    parser.add_argument(
        "--latest", "-l", action="store_true",
        help=f"최신 PDF 자동 선택 ({DOWNLOAD_DIR})"
    )
    parser.add_argument(
        "--type", default="disease",
        choices=["disease", "guide", "news"],
        help="자료 유형 (기본: disease)"
    )
    parser.add_argument(
        "--hidden", action="store_true",
        help="비공개 등록"
    )
    parser.add_argument(
        "--design", "-d", default="인포그래픽",
        help="디자인 스타일 (기본: 인포그래픽)"
    )

    args = parser.parse_args()

    # 입력 검증
    if not args.title or not args.title.strip():
        print("오류: --title이 비어 있습니다.")
        return 1

    # PDF 경로 결정
    pdf_path: "str | None" = None
    if args.pdf:
        pdf_file = Path(args.pdf)
        if not pdf_file.exists():
            print(f"오류: PDF 파일을 찾을 수 없습니다: {args.pdf}")
            logger.error("지정한 PDF 파일이 없음: %s", args.pdf)
            return 1
        if pdf_file.suffix.lower() != '.pdf':
            print(f"오류: 지정한 파일이 PDF가 아닙니다: {args.pdf}")
            return 1
        pdf_path = args.pdf
    elif args.latest:
        latest = find_latest_pdf()
        if not latest:
            print(f"오류: {DOWNLOAD_DIR} 에서 PDF를 찾을 수 없습니다.")
            return 1
        pdf_path = str(latest)
        print(f"최신 PDF 선택: {pdf_path}")
    else:
        print("오류: --pdf 또는 --latest 중 하나를 지정하세요.")
        parser.print_help()
        return 1

    pipeline = NoterangPipeline(
        title=args.title,
        pdf_path=pdf_path,
        register=True,
        visible=not args.hidden,
        article_type=args.type,
        design=args.design,
    )

    try:
        result = await pipeline.run()
    except KeyboardInterrupt:
        print("\n사용자에 의해 중단되었습니다.")
        return 1
    except Exception as e:
        logger.error("파이프라인 실행 중 예상치 못한 오류: %s", e, exc_info=True)
        print(f"\n오류: 파이프라인 실행 실패: {e}")
        return 1

    print(f"\nRESULT:{json.dumps(result, ensure_ascii=False)}")
    return 0 if result.get("success") else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
