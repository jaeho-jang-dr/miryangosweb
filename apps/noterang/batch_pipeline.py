#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 병렬 배치 파이프라인

여러 노트북을 동시에 실행합니다.
각 워커는 독립 브라우저 프로필과 독립 클라이언트를 사용합니다.

Usage:
    python batch_pipeline.py --titles "골다공증,연소성척추측만증,경추후만증" --design "메디컬 케어"
    python batch_pipeline.py --titles "A,B,C,D,E" --max-workers 3 --design "미니멀 젠"
"""
import argparse
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

# Ensure the noterang package located next to this script is importable
sys.path.insert(0, str(Path(__file__).parent))

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
    pass

from noterang.config import NoterangConfig
from noterang.auth import ensure_auth
from run_pipeline import NoterangPipeline


class BatchPipeline:
    """Parallel batch orchestrator for multiple Noterang pipelines.

    Runs up to *max_workers* pipelines concurrently using
    :class:`asyncio.Semaphore`.  Each worker gets its own browser profile
    so that sessions do not interfere with each other.
    """

    def __init__(
        self,
        titles: List[str],
        design: str = "인포그래픽",
        max_workers: int = 3,
        register: bool = True,
        visible: bool = True,
        article_type: str = "disease",
        slide_count: int = 15,
    ) -> None:
        """Initialize the batch pipeline.

        Args:
            titles: List of notebook titles to process.
            design: Slide design preset name (default ``"인포그래픽"``).
            max_workers: Maximum number of pipelines to run concurrently.
                Capped at ``len(titles)``.
            register: When ``True`` the finished slides are registered in the
                web archive.
            visible: When ``True`` the registered article is publicly visible.
            article_type: Article type tag (e.g. ``"disease"``, ``"guide"``).
            slide_count: Number of slides per notebook (default 15).
        """
        self.titles = titles
        self.design = design
        self.max_workers = min(max_workers, len(titles))
        self.register = register
        self.visible = visible
        self.article_type = article_type
        self.slide_count = slide_count

    async def run(self) -> List[Dict[str, Any]]:
        """Run all pipelines and return their results.

        Returns:
            List of result dictionaries, one per title, each containing at
            minimum ``"success"`` (bool) and ``"title"`` (str) keys.
        """
        start_time = time.time()

        print("\n" + "=" * 60)
        print("  노트랑 병렬 배치 파이프라인")
        print("=" * 60)
        print(f"  제목: {', '.join(self.titles)}")
        print(f"  디자인: {self.design}")
        print(f"  워커 수: {self.max_workers}")
        print(f"  총 노트북: {len(self.titles)}")
        print("=" * 60)

        print("\n[사전] 인증 확인...")
        if not await ensure_auth():
            logger.error("Authentication failed; aborting batch")
            print("  인증 실패")
            return [{"success": False, "error": "인증 실패", "title": t} for t in self.titles]
        print("  ✓ 인증 유효")

        semaphore = asyncio.Semaphore(self.max_workers)
        tasks = [
            self._run_worker(i, title, semaphore)
            for i, title in enumerate(self.titles)
        ]
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        final_results: List[Dict[str, Any]] = []
        for i, result in enumerate(raw_results):
            if isinstance(result, Exception):
                final_results.append({
                    "success": False,
                    "title": self.titles[i],
                    "error": str(result),
                })
            else:
                final_results.append(result)

        elapsed = int(time.time() - start_time)
        success_count = sum(1 for r in final_results if r.get("success"))

        print("\n" + "=" * 60)
        print("  배치 실행 완료")
        print("=" * 60)
        for r in final_results:
            status = "성공" if r.get("success") else "실패"
            print(f"  [{status}] {r.get('title', '?')}: {r.get('error', 'OK')}")
        print(f"\n  성공: {success_count}/{len(self.titles)}")
        print(f"  소요시간: {elapsed}초")
        print("=" * 60)

        return final_results

    async def _run_worker(
        self,
        worker_id: int,
        title: str,
        semaphore: asyncio.Semaphore,
    ) -> Dict[str, Any]:
        """Run a single pipeline for *title* inside the semaphore guard.

        Args:
            worker_id: Zero-based worker index used to isolate browser profiles.
            title: Notebook title for this pipeline instance.
            semaphore: Shared semaphore that limits concurrent executions.

        Returns:
            Pipeline result dictionary.
        """
        async with semaphore:
            logger.info("Worker %d starting: %s", worker_id, title)
            print(f"\nWorker {worker_id}: '{title}' 시작")

            config = NoterangConfig.load()
            config.worker_id = worker_id
            config.ensure_dirs()

            pipeline = NoterangPipeline(
                title=title,
                design=self.design,
                register=self.register,
                visible=self.visible,
                article_type=self.article_type,
                slide_count=self.slide_count,
                config_override=config,
            )

            try:
                result = await pipeline.run()
                logger.info("Worker %d completed: %s", worker_id, title)
                print(f"\nWorker {worker_id}: '{title}' 완료")
                return result
            except Exception as e:
                logger.exception("Worker %d failed for '%s'", worker_id, title)
                print(f"\nWorker {worker_id}: '{title}' 실패 - {e}")
                return {
                    "success": False,
                    "title": title,
                    "error": str(e),
                }


async def main() -> int:
    """CLI entry point for the batch pipeline.

    Returns:
        Exit code: 0 when all titles succeeded, 1 otherwise.
    """
    parser = argparse.ArgumentParser(
        description="노트랑 병렬 배치 파이프라인"
    )
    parser.add_argument(
        "--titles", "-t", required=True,
        help="쉼표 구분 제목들 (예: '골다공증,측만증,거북목')"
    )
    parser.add_argument(
        "--design", "-d", default="인포그래픽",
        help="슬라이드 디자인 스타일 (기본: 인포그래픽)"
    )
    parser.add_argument(
        "--max-workers", type=int, default=3,
        help="최대 동시 실행 수 (기본: 3)"
    )
    parser.add_argument(
        "--no-register", action="store_true",
        help="자료실 등록 안 함"
    )
    parser.add_argument(
        "--hidden", action="store_true",
        help="비공개 등록"
    )
    parser.add_argument(
        "--type", default="disease",
        choices=["disease", "guide", "news"],
        help="자료 유형 (기본: disease)"
    )
    parser.add_argument(
        "--slides", "-s", type=int, default=15,
        help="슬라이드 장수 (기본: 15)"
    )

    args = parser.parse_args()

    titles = [t.strip() for t in args.titles.split(",") if t.strip()]

    batch = BatchPipeline(
        titles=titles,
        design=args.design,
        max_workers=args.max_workers,
        register=not args.no_register,
        visible=not args.hidden,
        article_type=args.type,
        slide_count=args.slides,
    )

    results = await batch.run()
    print(f"\nRESULT:{json.dumps(results, ensure_ascii=False)}")

    success_count = sum(1 for r in results if r.get("success"))
    return 0 if success_count == len(titles) else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
