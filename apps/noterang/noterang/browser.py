#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 브라우저 모듈
- Playwright 기반 NotebookLM 직접 제어
- nlm CLI 버그 우회
"""
import asyncio
import json
import sys
import time
import re
from pathlib import Path
from typing import Optional, List, Dict, Tuple
from datetime import datetime

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from .config import get_config


class NotebookLMBrowser:
    """
    NotebookLM 브라우저 자동화 클래스
    Playwright를 사용하여 직접 NotebookLM 제어
    """

    def __init__(self, headless: bool = None):
        self.config = get_config()
        self.base_url = "https://notebooklm.google.com"
        self.context = None
        self.page = None
        self._headless = headless if headless is not None else self.config.browser_headless
        self.current_notebook_id: Optional[str] = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def start(self):
        """브라우저 시작"""
        from playwright.async_api import async_playwright

        self.playwright = await async_playwright().start()
        self.context = await self.playwright.chromium.launch_persistent_context(
            user_data_dir=str(self.config.browser_profile),
            headless=self._headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
            ],
            viewport={
                'width': self.config.browser_viewport_width,
                'height': self.config.browser_viewport_height
            },
            accept_downloads=True,
            downloads_path=str(self.config.download_dir),
        )
        self.page = self.context.pages[0] if self.context.pages else await self.context.new_page()

    async def close(self):
        """브라우저 종료"""
        if self.context:
            await self.context.close()
        if self.playwright:
            await self.playwright.stop()

    async def ensure_logged_in(self) -> bool:
        """로그인 확인 (완전 자동 로그인 포함)"""
        await self.page.goto(self.base_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(3)

        # 로그인 페이지로 리다이렉트 되었는지 확인
        if 'accounts.google.com' in self.page.url:
            print("  로그인 필요 - 완전 자동 로그인 시작...")

            # 완전 자동 로그인 시도 (TOTP 포함)
            try:
                from .auto_login import full_auto_login, BROWSER_PROFILE
                success = await full_auto_login(headless=self.config.browser_headless)

                if success:
                    # 자동 로그인 성공 후 브라우저 재시작
                    await self.close()
                    from playwright.async_api import async_playwright
                    self.playwright = await async_playwright().start()
                    self.context = await self.playwright.chromium.launch_persistent_context(
                        user_data_dir=str(BROWSER_PROFILE),
                        headless=self._headless,
                        args=['--disable-blink-features=AutomationControlled'],
                        viewport={
                            'width': self.config.browser_viewport_width,
                            'height': self.config.browser_viewport_height
                        },
                        accept_downloads=True,
                        downloads_path=str(self.config.download_dir),
                    )
                    self.page = self.context.pages[0] if self.context.pages else await self.context.new_page()
                    await self.page.goto(self.base_url, timeout=30000)
                    await asyncio.sleep(3)
                    return True
            except Exception as e:
                print(f"  완전 자동 로그인 실패: {e}")

            # 폴백: 수동 대기
            start = time.time()
            while time.time() - start < 120:
                if 'notebooklm.google.com' in self.page.url and 'accounts.google' not in self.page.url:
                    break
                await asyncio.sleep(2)

        return 'notebooklm.google.com' in self.page.url and 'accounts.google' not in self.page.url

    async def _try_app_password(self):
        """앱 비밀번호 입력 시도"""
        try:
            password_input = await self.page.query_selector('input[type="password"]')
            if password_input:
                clean_password = self.config.notebooklm_app_password.replace(' ', '')
                await password_input.fill(clean_password)
                await asyncio.sleep(0.5)

                next_btn = await self.page.query_selector('button:has-text("Next"), button:has-text("다음")')
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(3)
        except Exception as e:
            print(f"  앱 비밀번호 입력 실패: {e}")

    async def list_notebooks(self) -> List[Dict]:
        """노트북 목록 조회"""
        await self.page.goto(self.base_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(5)

        notebooks = []

        # 노트북 카드 찾기
        cards = await self.page.query_selector_all('[data-notebook-id], .notebook-card, [class*="notebook"]')

        for card in cards:
            try:
                notebook_id = await card.get_attribute('data-notebook-id')
                title_elem = await card.query_selector('h3, [class*="title"]')
                title = await title_elem.inner_text() if title_elem else "Untitled"

                if notebook_id:
                    notebooks.append({
                        'id': notebook_id,
                        'title': title.strip()
                    })
            except:
                continue

        # 대체 방법: URL에서 노트북 ID 추출
        if not notebooks:
            links = await self.page.query_selector_all('a[href*="/notebook/"]')
            for link in links:
                try:
                    href = await link.get_attribute('href')
                    if '/notebook/' in href:
                        notebook_id = href.split('/notebook/')[-1].split('/')[0].split('?')[0]
                        title_elem = await link.query_selector('h3, span, [class*="title"]')
                        title = await title_elem.inner_text() if title_elem else notebook_id[:8]

                        if notebook_id and len(notebook_id) > 10:
                            notebooks.append({
                                'id': notebook_id,
                                'title': title.strip()
                            })
                except:
                    continue

        return notebooks

    async def find_notebook(self, title: str) -> Optional[Dict]:
        """제목으로 노트북 찾기"""
        notebooks = await self.list_notebooks()
        for nb in notebooks:
            if nb.get('title') == title:
                return nb
        return None

    async def find_or_create_notebook(self, title: str) -> Optional[Dict]:
        """
        노트북 찾기, 없으면 생성

        Args:
            title: 노트북 제목

        Returns:
            {"id": "...", "title": "..."} 또는 None
        """
        # 먼저 기존 노트북 찾기
        notebook = await self.find_notebook(title)
        if notebook:
            self.current_notebook_id = notebook.get('id')
            await self.open_notebook(self.current_notebook_id)
            return notebook

        # 없으면 새로 생성
        notebook_id = await self.create_notebook(title)
        if notebook_id:
            self.current_notebook_id = notebook_id
            return {"id": notebook_id, "title": title}

        return None

    async def create_notebook(self, title: str) -> Optional[str]:
        """새 노트북 생성"""
        await self.page.goto(self.base_url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(3)

        # "새 노트북" 또는 "Create" 버튼 찾기
        create_btn = await self.page.query_selector(
            'button:has-text("새 노트북"), '
            'button:has-text("Create"), '
            'button:has-text("New notebook"), '
            '[aria-label*="Create"], '
            '[aria-label*="새 노트북"]'
        )

        if create_btn:
            await create_btn.click()
            await asyncio.sleep(3)

            # 제목 입력 필드 찾기
            title_input = await self.page.query_selector(
                'input[placeholder*="제목"], '
                'input[placeholder*="title"], '
                'input[aria-label*="title"], '
                '[contenteditable="true"]'
            )

            if title_input:
                await title_input.fill(title)
                await asyncio.sleep(1)

                # 생성 버튼 클릭
                confirm_btn = await self.page.query_selector(
                    'button:has-text("만들기"), '
                    'button:has-text("Create"), '
                    'button[type="submit"]'
                )
                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(5)

        # 현재 URL에서 노트북 ID 추출
        current_url = self.page.url
        if '/notebook/' in current_url:
            notebook_id = current_url.split('/notebook/')[-1].split('/')[0].split('?')[0]
            return notebook_id

        return None

    async def open_notebook(self, notebook_id: str):
        """노트북 열기"""
        url = f"{self.base_url}/notebook/{notebook_id}"
        await self.page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(5)

    async def delete_notebook(self, notebook_id: str) -> bool:
        """노트북 삭제"""
        await self.open_notebook(notebook_id)
        await asyncio.sleep(2)

        # 설정/메뉴 버튼 찾기
        menu_btn = await self.page.query_selector(
            '[aria-label*="설정"], '
            '[aria-label*="Settings"], '
            '[aria-label*="More"], '
            'button[aria-haspopup="menu"]'
        )

        if menu_btn:
            await menu_btn.click()
            await asyncio.sleep(1)

            # 삭제 옵션 찾기
            delete_btn = await self.page.query_selector(
                '[role="menuitem"]:has-text("삭제"), '
                '[role="menuitem"]:has-text("Delete")'
            )

            if delete_btn:
                await delete_btn.click()
                await asyncio.sleep(1)

                # 확인 버튼
                confirm_btn = await self.page.query_selector(
                    'button:has-text("삭제"), '
                    'button:has-text("Delete"), '
                    'button:has-text("확인")'
                )

                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(2)
                    return True

        return False

    async def add_source_url(self, notebook_id: str, url: str) -> bool:
        """URL 소스 추가"""
        await self.open_notebook(notebook_id)
        await asyncio.sleep(2)

        # 소스 추가 버튼 찾기
        add_btn = await self.page.query_selector(
            'button:has-text("소스 추가"), '
            'button:has-text("Add source"), '
            '[aria-label*="Add source"]'
        )

        if add_btn:
            await add_btn.click()
            await asyncio.sleep(1)

            # URL 옵션 선택
            url_option = await self.page.query_selector(
                'button:has-text("웹사이트"), '
                'button:has-text("Website"), '
                'button:has-text("Link")'
            )

            if url_option:
                await url_option.click()
                await asyncio.sleep(1)

                # URL 입력
                url_input = await self.page.query_selector('input[type="url"], input[placeholder*="URL"]')
                if url_input:
                    await url_input.fill(url)
                    await asyncio.sleep(0.5)

                    # 확인 버튼
                    submit_btn = await self.page.query_selector('button[type="submit"], button:has-text("추가")')
                    if submit_btn:
                        await submit_btn.click()
                        await asyncio.sleep(3)
                        return True

        return False

    async def add_source_via_search(self, query: str) -> bool:
        """웹 검색으로 소스 추가

        Args:
            query: 검색 쿼리 문자열

        Returns:
            성공 여부
        """
        try:
            # 소스 추가 버튼 찾기
            add_btn = await self.page.query_selector(
                'button:has-text("소스 추가"), '
                'button:has-text("Add source"), '
                '[aria-label*="Add source"]'
            )

            if not add_btn:
                print("  ⚠️ 소스 추가 버튼을 찾을 수 없습니다")
                return False

            await add_btn.click()
            await asyncio.sleep(1)

            # 검색 옵션 선택
            search_option = await self.page.query_selector(
                'button:has-text("검색"), '
                'button:has-text("Search"), '
                'button:has-text("Web search")'
            )

            if search_option:
                await search_option.click()
                await asyncio.sleep(1)

                # 검색어 입력
                search_input = await self.page.query_selector(
                    'input[type="search"], '
                    'input[placeholder*="검색"], '
                    'input[placeholder*="Search"]'
                )
                if search_input:
                    await search_input.fill(query)
                    await asyncio.sleep(0.5)
                    await search_input.press("Enter")
                    await asyncio.sleep(3)

                    # 첫 번째 결과 선택
                    result_item = await self.page.query_selector(
                        '[role="listitem"]:first-child, '
                        '[class*="result"]:first-child, '
                        '[class*="search-result"]:first-child'
                    )
                    if result_item:
                        await result_item.click()
                        await asyncio.sleep(1)

                    # 추가/확인 버튼
                    submit_btn = await self.page.query_selector(
                        'button[type="submit"], '
                        'button:has-text("추가"), '
                        'button:has-text("Add"), '
                        'button:has-text("Insert")'
                    )
                    if submit_btn:
                        await submit_btn.click()
                        await asyncio.sleep(3)
                        print(f"  ✓ 웹 검색 소스 추가: {query[:30]}...")
                        return True

            print(f"  ⚠️ 웹 검색 소스 추가 실패")
            return False
        except Exception as e:
            print(f"  ⚠️ 웹 검색 소스 추가 오류: {e}")
            return False

    async def create_slides(
        self,
        language: str = "Korean",
        slide_count: int = 15,
        design_prompt: str = "",
        notebook_id: str = None,
    ) -> bool:
        """
        슬라이드 생성 요청

        Args:
            language: 언어 ("Korean", "English" 등)
            slide_count: 슬라이드 수 (기본 15)
            design_prompt: 디자인 프롬프트 (선택사항)
            notebook_id: 노트북 ID (None이면 현재 노트북)

        Returns:
            성공 여부
        """
        if notebook_id:
            await self.open_notebook(notebook_id)
            await asyncio.sleep(3)

        # 스튜디오 패널 열기
        print("  🔍 스튜디오 패널 찾는 중...")

        # 스튜디오 탭/버튼 클릭
        studio_selectors = [
            '[aria-label*="Studio"]',
            'button:has-text("Studio")',
            '[data-panel="studio"]',
            'button[aria-selected="false"]:has-text("Studio")',
        ]

        for sel in studio_selectors:
            studio_tab = await self.page.query_selector(sel)
            if studio_tab:
                await studio_tab.click()
                await asyncio.sleep(2)
                print(f"  ✓ 스튜디오 패널 열림")
                break

        # 슬라이드 생성 버튼 찾기
        slide_btn_selectors = [
            'button:has-text("슬라이드")',
            'button:has-text("Slides")',
            'button:has-text("프레젠테이션")',
            'button:has-text("Presentation")',
            '[aria-label*="slide"]',
            '[aria-label*="presentation"]',
        ]

        slide_btn = None
        for sel in slide_btn_selectors:
            slide_btn = await self.page.query_selector(sel)
            if slide_btn:
                print(f"  ✓ 슬라이드 버튼 발견")
                break

        if not slide_btn:
            # 텍스트로 버튼 검색
            buttons = await self.page.query_selector_all("button")
            for btn in buttons:
                txt = await btn.inner_text()
                if "슬라이드" in txt or "Slides" in txt or "Presentation" in txt:
                    slide_btn = btn
                    print(f"  ✓ 슬라이드 버튼 발견: '{txt.strip()}'")
                    break

        if not slide_btn:
            print("  ❌ 슬라이드 버튼을 찾을 수 없습니다")
            debug_path = str(self.config.download_dir / "debug_no_slide_btn.png")
            await self.page.screenshot(path=debug_path)
            return False

        # 슬라이드 버튼 클릭
        await slide_btn.click()
        await asyncio.sleep(3)

        # 언어 선택
        print(f"  🌐 언어 설정: {language}")
        lang_selectors = [
            'select',
            '[role="listbox"]',
            'button:has-text("English")',
            'button:has-text("한국어")',
            '[aria-label*="language"]',
        ]

        for sel in lang_selectors:
            lang_elem = await self.page.query_selector(sel)
            if lang_elem:
                await lang_elem.click()
                await asyncio.sleep(1)

                # 한국어 옵션 선택
                korean_options = [
                    f'[role="option"]:has-text("{language}")',
                    f'option:has-text("{language}")',
                    f'li:has-text("{language}")',
                    '[role="option"]:has-text("한국어")',
                    '[role="option"]:has-text("Korean")',
                ]

                for opt_sel in korean_options:
                    korean_opt = await self.page.query_selector(opt_sel)
                    if korean_opt:
                        await korean_opt.click()
                        await asyncio.sleep(1)
                        print(f"  ✓ 언어 선택 완료")
                        break
                break

        # 디자인 프롬프트 입력 (있는 경우)
        if design_prompt:
            print("  📝 디자인 프롬프트 입력...")
            prompt_input = await self.page.query_selector(
                'textarea[placeholder*="prompt"], '
                'textarea[placeholder*="style"], '
                'input[placeholder*="prompt"], '
                '[contenteditable="true"]'
            )
            if prompt_input:
                await prompt_input.fill(design_prompt)
                await asyncio.sleep(1)
                print("  ✓ 디자인 프롬프트 입력 완료")

        # 생성 버튼 클릭
        create_selectors = [
            'button:has-text("생성")',
            'button:has-text("Create")',
            'button:has-text("Generate")',
            'button[type="submit"]',
        ]

        for sel in create_selectors:
            create_btn = await self.page.query_selector(sel)
            if create_btn:
                await create_btn.click()
                await asyncio.sleep(5)
                print("  ✓ 슬라이드 생성 요청 완료")
                return True

        print("  ❌ 생성 버튼을 찾을 수 없습니다")
        return False

    async def check_slides_ready(self, notebook_id: str = None) -> bool:
        """
        슬라이드 생성 완료 여부 확인

        Args:
            notebook_id: 노트북 ID (None이면 현재 페이지에서 확인)

        Returns:
            생성 완료 여부
        """
        if notebook_id:
            await self.open_notebook(notebook_id)
            await asyncio.sleep(2)

        # 로딩/생성 중 인디케이터 확인
        loading_indicators = [
            '[class*="loading"]',
            '[class*="spinner"]',
            '[class*="progress"]',
            '[aria-busy="true"]',
        ]

        for sel in loading_indicators:
            loading = await self.page.query_selector(sel)
            if loading:
                is_visible = await loading.is_visible()
                if is_visible:
                    return False  # 아직 생성 중

        # 다운로드 버튼이 있으면 완료
        download_selectors = [
            'button:has-text("다운로드")',
            'button:has-text("Download")',
            '[aria-label*="download"]',
            '[aria-label*="Download"]',
            'button[aria-label*="더보기"]',  # more menu button
        ]

        for sel in download_selectors:
            download_btn = await self.page.query_selector(sel)
            if download_btn:
                is_visible = await download_btn.is_visible()
                if is_visible:
                    return True

        # 슬라이드 미리보기가 보이면 완료
        preview_selectors = [
            '[class*="slide-preview"]',
            '[class*="presentation-preview"]',
            'img[alt*="slide"]',
            '[data-slide-index]',
        ]

        for sel in preview_selectors:
            preview = await self.page.query_selector(sel)
            if preview:
                return True

        return False

    async def get_slide_status(self, notebook_id: str = None) -> Tuple[bool, str]:
        """
        슬라이드 생성 상태 상세 확인

        Returns:
            (완료여부, 상태문자열)
        """
        if notebook_id:
            await self.open_notebook(notebook_id)
            await asyncio.sleep(2)

        # 상태 텍스트 확인
        status_elem = await self.page.query_selector(
            '[class*="status"], '
            '[class*="progress"], '
            '[aria-label*="status"]'
        )

        if status_elem:
            status_text = await status_elem.inner_text()
            if '완료' in status_text or 'complete' in status_text.lower() or 'ready' in status_text.lower():
                return True, "completed"
            elif '진행' in status_text or 'progress' in status_text.lower() or 'generating' in status_text.lower():
                return False, "in_progress"
            elif '실패' in status_text or 'fail' in status_text.lower() or 'error' in status_text.lower():
                return False, "failed"

        # 다운로드 버튼이 있으면 완료
        is_ready = await self.check_slides_ready()
        if is_ready:
            return True, "completed"

        return False, "unknown"

    async def wait_for_slides(self, notebook_id: str, timeout: int = None) -> bool:
        """슬라이드 생성 완료 대기"""
        max_wait = timeout or self.config.timeout_slides
        start = time.time()

        while time.time() - start < max_wait:
            ready, status = await self.get_slide_status(notebook_id)

            if ready:
                print(f"  ✓ 슬라이드 생성 완료")
                return True
            elif status == "failed":
                print(f"  ❌ 슬라이드 생성 실패")
                return False

            elapsed = int(time.time() - start)
            print(f"\r  생성 중... {elapsed}초", end="", flush=True)
            await asyncio.sleep(10)

        print(f"\n  ⏰ 타임아웃 ({max_wait}초)")
        return False

    async def download_slides(self, target_path: str = None, notebook_id: str = None) -> Optional[Path]:
        """
        슬라이드 PDF 다운로드

        Args:
            target_path: 저장할 파일 경로 (None이면 자동 생성)
            notebook_id: 노트북 ID (None이면 현재 페이지)

        Returns:
            다운로드된 파일 경로 또는 None
        """
        if notebook_id:
            await self.open_notebook(notebook_id)
            await asyncio.sleep(3)

        # 타겟 경로 설정
        if target_path:
            save_path = Path(target_path)
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            save_path = self.config.download_dir / f"slides_{timestamp}.pdf"

        save_path.parent.mkdir(parents=True, exist_ok=True)

        # 다양한 다운로드 방법 시도
        methods = [
            lambda: self._download_via_menu(save_path),
            lambda: self._download_via_button(save_path),
            lambda: self._download_via_keyboard(save_path),
        ]

        for method in methods:
            result = await method()
            if result:
                return result

        return None

    async def _download_via_menu(self, save_path: Path) -> Optional[Path]:
        """메뉴를 통한 다운로드"""
        menu_btns = await self.page.query_selector_all('[aria-haspopup="menu"], button[aria-label*="more"], button[aria-label*="더보기"]')

        for menu_btn in menu_btns[-10:]:
            try:
                await menu_btn.click(force=True)
                await asyncio.sleep(1)

                dl_item = await self.page.query_selector(
                    '[role="menuitem"]:has-text("다운로드"), '
                    '[role="menuitem"]:has-text("Download")'
                )

                if dl_item:
                    async with self.page.expect_download(timeout=60000) as download_info:
                        await dl_item.click()

                    download = await download_info.value
                    await download.save_as(str(save_path))
                    return save_path

                await self.page.keyboard.press('Escape')

            except Exception:
                try:
                    await self.page.keyboard.press('Escape')
                except:
                    pass

        return None

    async def _download_via_button(self, save_path: Path) -> Optional[Path]:
        """다운로드 버튼 직접 클릭"""
        dl_btn = await self.page.query_selector(
            'button:has-text("다운로드"), '
            'button:has-text("Download"), '
            '[aria-label*="download"], '
            '[aria-label*="Download"]'
        )

        if dl_btn:
            try:
                async with self.page.expect_download(timeout=60000) as download_info:
                    await dl_btn.click()

                download = await download_info.value
                await download.save_as(str(save_path))
                return save_path
            except:
                pass

        return None

    async def _download_via_keyboard(self, save_path: Path) -> Optional[Path]:
        """키보드 단축키로 다운로드 (폴백)"""
        # 현재는 미구현
        return None

    async def screenshot(self, path: Path = None) -> Path:
        """스크린샷 저장"""
        if not path:
            path = self.config.download_dir / f"screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        await self.page.screenshot(path=str(path))
        return path


async def run_with_browser(callback):
    """브라우저 컨텍스트에서 콜백 실행"""
    async with NotebookLMBrowser() as browser:
        return await callback(browser)
