#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 기본 워크플로우

워크플로우:
1. 노트북 생성 또는 기존 노트북 선택
2. 디자인 선택 (9개 프리셋 또는 커스텀)
3. 15장 한글 슬라이드 생성 요청
4. 생성 완료까지 모니터링 (일정 간격 체크)
5. PDF 다운로드 → G:/내 드라이브/notebooklm/
6. PPTX 변환

Usage:
    python -m noterang.workflow --title "족관절 염좌"
    python -m noterang.workflow --title "족관절 염좌" --design "클레이 3D"
"""
import asyncio
import logging
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

# Default download directory
DOWNLOAD_DIR = Path("G:/내 드라이브/notebooklm")

# Default slide monitoring timeout (seconds)
_DEFAULT_MONITOR_TIMEOUT = 300
# Default polling interval for slide generation (seconds)
_DEFAULT_MONITOR_INTERVAL = 10
# Number of preset designs exposed in the quick-selection menu
_PRESET_COUNT = 9

# 9개 기본 디자인 프리셋
DESIGN_PRESETS = [
    {"id": 1, "name": "미니멀 젠", "category": "심플", "description": "깔끔한 기본 스타일"},
    {"id": 2, "name": "클레이 3D", "category": "카툰", "description": "부드러운 3D 클레이 스타일"},
    {"id": 3, "name": "메디컬 케어", "category": "비즈니스", "description": "의료/건강 전문 스타일"},
    {"id": 4, "name": "사이언스 랩", "category": "학술", "description": "과학/연구 스타일"},
    {"id": 5, "name": "학술 논문", "category": "학술", "description": "학술 발표 스타일"},
    {"id": 6, "name": "인포그래픽", "category": "테크니컬", "description": "데이터 시각화 스타일"},
    {"id": 7, "name": "코퍼레이트", "category": "비즈니스", "description": "비즈니스 프레젠테이션"},
    {"id": 8, "name": "클린 모던", "category": "심플", "description": "현대적 깔끔한 스타일"},
    {"id": 9, "name": "다크 모드", "category": "모던", "description": "어두운 배경 스타일"},
]

# 질병/의료 관련 추천 디자인
MEDICAL_DESIGNS = ["메디컬 케어", "사이언스 랩", "학술 논문", "인포그래픽",
                   "클린 모던", "미니멀 젠", "코퍼레이트"]


# Default design fallback values
_DEFAULT_DESIGN_NAME = "미니멀 젠"
_DEFAULT_DESIGN_CATEGORY = "심플"


def print_design_menu() -> None:
    """Print the interactive design selection menu to stdout."""
    print("\n" + "=" * 60)
    print("  슬라이드 디자인 선택")
    print("=" * 60)
    print()
    for preset in DESIGN_PRESETS:
        print(f"  [{preset['id']}] {preset['name']:<12} - {preset['description']}")
    print()
    print("  [0] 직접 입력 (100개 스타일 중 선택)")
    print("=" * 60)


def select_design(choice: Optional[int] = None) -> Dict[str, str]:
    """Resolve a design preset to a name/category pair.

    Args:
        choice: Preset index (1-9), 0 to enter a custom style name interactively,
            or ``None`` to display the menu and prompt the user.

    Returns:
        Dictionary with keys ``"name"`` and ``"category"``.
    """
    if choice is None:
        print_design_menu()
        try:
            choice = int(input("  디자인 번호 선택 (1-9, 기본=1): ").strip() or "1")
        except ValueError:
            choice = 1

    if choice == 0:
        from .prompts import SlidePrompts
        prompts = SlidePrompts()

        print("\n카테고리:", ", ".join(prompts.list_categories()))
        style_name = input("스타일 이름 입력: ").strip()

        if style_name in prompts:
            style = prompts.get_style(style_name)
            return {"name": style["name"], "category": style["category"]}

        logger.warning("Style '%s' not found; using default.", style_name)
        print(f"'{style_name}' 스타일을 찾을 수 없습니다. 기본 스타일 사용.")
        return {"name": _DEFAULT_DESIGN_NAME, "category": _DEFAULT_DESIGN_CATEGORY}

    if 1 <= choice <= _PRESET_COUNT:
        preset = DESIGN_PRESETS[choice - 1]
        return {"name": preset["name"], "category": preset["category"]}

    logger.warning("Invalid design choice %d; using default.", choice)
    print("잘못된 선택. 기본 스타일 사용.")
    return {"name": _DEFAULT_DESIGN_NAME, "category": _DEFAULT_DESIGN_CATEGORY}


def get_design_prompt(design_name: str) -> str:
    """Look up the slide prompt for a named design.

    Args:
        design_name: The human-readable design name (e.g. ``"미니멀 젠"``).

    Returns:
        The prompt string, or an empty string when the name is unknown.
    """
    from .prompts import SlidePrompts
    prompts = SlidePrompts()
    return prompts.get_prompt(design_name) or ""


class NoterangWorkflow:
    """Browser-based Noterang workflow manager.

    Drives NotebookLM through a real browser: login, notebook creation,
    slide generation, monitoring, PDF download, and PPTX conversion.
    """

    def __init__(
        self,
        title: str,
        design: Optional[str] = None,
        slide_count: int = 15,
        language: str = "ko",
        download_dir: Optional[Path] = None,
    ) -> None:
        """Initialize the workflow.

        Args:
            title: Notebook and slide title.
            design: Design preset name. When ``None`` the interactive menu is
                displayed at runtime.
            slide_count: Number of slides to generate (default 15).
            language: Language code for the slides (default ``"ko"``).
            download_dir: Directory for downloaded PDF files.
                Defaults to :data:`DOWNLOAD_DIR`.
        """
        self.title = title
        self.design_name = design
        self.slide_count = slide_count
        self.language = language
        self.download_dir = download_dir or DOWNLOAD_DIR

        self.notebook_id: Optional[str] = None
        self.pdf_path: Optional[Path] = None
        self.pptx_path: Optional[Path] = None

    async def run(self, headless: bool = False) -> Dict[str, Any]:
        """Execute the full browser-based workflow.

        Args:
            headless: When ``True`` the browser runs without a visible window.

        Returns:
            Result dictionary with keys:
            ``success``, ``notebook_id``, ``pdf_path``, ``pptx_path``,
            ``slide_count``, ``design``, and ``error`` (on failure).
        """
        print("\n" + "=" * 60)
        print("  노트랑 워크플로우 시작")
        print(f"  제목: {self.title}")
        print("=" * 60)

        try:
            # 1. 디자인 선택
            if self.design_name is None:
                design = select_design()
                self.design_name = design["name"]

            print(f"\n✓ 디자인: {self.design_name}")

            # 2. 브라우저 시작 및 로그인
            print("\n[1/5] 브라우저 시작 및 로그인...")
            from .browser import NotebookLMBrowser

            browser = NotebookLMBrowser(headless=headless)
            await browser.start()

            if not await browser.ensure_logged_in():
                return {"success": False, "error": "로그인 실패"}

            print("  ✓ 로그인 완료")

            # 3. 노트북 찾기 또는 생성
            print(f"\n[2/5] 노트북 '{self.title}' 찾기/생성...")
            notebook = await browser.find_or_create_notebook(self.title)

            if not notebook:
                await browser.close()
                return {"success": False, "error": "노트북 생성 실패"}

            self.notebook_id = notebook.get("id")
            print(f"  ✓ 노트북 ID: {self.notebook_id}")

            # 4. 슬라이드 생성 요청
            print(f"\n[3/5] 슬라이드 생성 요청 ({self.slide_count}장, 한글)...")
            design_prompt = get_design_prompt(self.design_name)

            success = await browser.create_slides(
                language="Korean",
                slide_count=self.slide_count,
                design_prompt=design_prompt,
            )

            if not success:
                await browser.close()
                return {"success": False, "error": "슬라이드 생성 요청 실패"}

            print("  ✓ 슬라이드 생성 요청 완료")

            # 5. 생성 완료 모니터링
            print(f"\n[4/5] 슬라이드 생성 모니터링...")
            completed = await self._monitor_slide_generation(browser)

            if not completed:
                await browser.close()
                return {"success": False, "error": "슬라이드 생성 타임아웃"}

            print("  ✓ 슬라이드 생성 완료")

            # 6. PDF 다운로드
            print(f"\n[5/5] PDF 다운로드...")
            self.download_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = self.title.replace(" ", "_").replace("/", "-")
            pdf_filename = f"{safe_title}_{self.design_name}_{timestamp}.pdf"
            self.pdf_path = self.download_dir / pdf_filename

            downloaded = await browser.download_slides(str(self.pdf_path))

            if not downloaded:
                await browser.close()
                return {"success": False, "error": "PDF 다운로드 실패"}

            print(f"  ✓ PDF 저장: {self.pdf_path}")

            await browser.close()

            # 7. PPTX 변환
            print(f"\n[변환] PDF → PPTX...")
            self.pptx_path = await self._convert_to_pptx()

            if self.pptx_path:
                print(f"  ✓ PPTX 저장: {self.pptx_path}")

            # 완료
            print("\n" + "=" * 60)
            print("  ✅ 워크플로우 완료!")
            print(f"  PDF:  {self.pdf_path}")
            print(f"  PPTX: {self.pptx_path}")
            print("=" * 60)

            return {
                "success": True,
                "notebook_id": self.notebook_id,
                "pdf_path": str(self.pdf_path),
                "pptx_path": str(self.pptx_path) if self.pptx_path else None,
                "slide_count": self.slide_count,
                "design": self.design_name,
            }

        except Exception as e:
            logger.exception("Workflow error for title '%s'", self.title)
            print(f"\n오류: {e}")
            return {"success": False, "error": str(e)}

    async def _monitor_slide_generation(
        self,
        browser: Any,
        timeout: int = _DEFAULT_MONITOR_TIMEOUT,
        interval: int = _DEFAULT_MONITOR_INTERVAL,
    ) -> bool:
        """Poll until slide generation finishes or the timeout elapses.

        Args:
            browser: Active :class:`~noterang.browser.NotebookLMBrowser` instance.
            timeout: Maximum wait time in seconds.
            interval: Polling interval in seconds.

        Returns:
            ``True`` if slides are ready within *timeout*, ``False`` otherwise.
        """
        start_time = time.time()
        check_count = 0

        while time.time() - start_time < timeout:
            check_count += 1
            elapsed = int(time.time() - start_time)

            print(f"  체크 #{check_count} ({elapsed}초 경과)...", end=" ")

            # 슬라이드 생성 완료 확인
            is_ready = await browser.check_slides_ready()

            if is_ready:
                print("✓ 완료!")
                return True

            print("생성 중...")
            await asyncio.sleep(interval)

        logger.warning("Slide generation timed out after %d seconds", timeout)
        print(f"  타임아웃 ({timeout}초)")
        return False

    async def _convert_to_pptx(self) -> Optional[Path]:
        """Convert the downloaded PDF to PPTX format.

        Returns:
            Path to the generated PPTX file, or ``None`` on failure.
        """
        if not self.pdf_path or not self.pdf_path.exists():
            return None

        try:
            from .converter import pdf_to_pptx

            pptx_path = self.pdf_path.with_suffix(".pptx")
            success = pdf_to_pptx(str(self.pdf_path), str(pptx_path))

            return pptx_path if success else None

        except Exception as e:
            logger.error("PPTX conversion failed: %s", e)
            print(f"  PPTX 변환 실패: {e}")
            return None


async def run_workflow(
    title: str,
    design: Optional[str] = None,
    slide_count: int = 15,
    headless: bool = False,
) -> Dict[str, Any]:
    """Convenience coroutine to run the full browser workflow.

    Args:
        title: Notebook title.
        design: Design preset name. Displays the interactive menu when ``None``.
        slide_count: Number of slides to generate (default 15).
        headless: Run the browser without a visible window.

    Returns:
        Workflow result dictionary (see :meth:`NoterangWorkflow.run`).
    """
    workflow = NoterangWorkflow(
        title=title,
        design=design,
        slide_count=slide_count,
    )
    return await workflow.run(headless=headless)


# CLI 실행
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="노트랑 기본 워크플로우")
    parser.add_argument("--title", "-t", required=True, help="노트북/슬라이드 제목")
    parser.add_argument("--design", "-d", help="디자인 이름 (미입력시 선택 메뉴)")
    parser.add_argument("--slides", "-s", type=int, default=15, help="슬라이드 수 (기본 15)")
    parser.add_argument("--headless", action="store_true", help="브라우저 숨김")
    parser.add_argument("--list-designs", action="store_true", help="디자인 목록 출력")

    args = parser.parse_args()

    if args.list_designs:
        print_design_menu()
        sys.exit(0)

    result = asyncio.run(run_workflow(
        title=args.title,
        design=args.design,
        slide_count=args.slides,
        headless=args.headless,
    ))

    sys.exit(0 if result.get("success") else 1)
