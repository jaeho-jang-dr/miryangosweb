#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 인증 모듈
- 자동 로그인 (브라우저 프로필 기반)
- 앱 비밀번호 지원
- 쿠키 관리
"""
import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Tuple

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from .config import get_config

logger = logging.getLogger(__name__)


async def auto_login(headless: bool = True, timeout: int = 60) -> bool:
    """
    자동 로그인 - 브라우저 프로필의 저장된 세션 사용

    Args:
        headless: True면 백그라운드 실행, False면 브라우저 표시
        timeout: 최대 대기 시간 (초)

    Returns:
        성공 여부
    """
    from playwright.async_api import async_playwright, Error as PlaywrightError, TimeoutError as PlaywrightTimeoutError

    if timeout <= 0:
        raise ValueError(f"timeout must be a positive integer, got {timeout}")

    config = get_config()

    print("=" * 50)
    print("NotebookLM 자동 로그인")
    print("=" * 50)

    config.ensure_dirs()

    context = None
    try:
        async with async_playwright() as p:
            print(f"\n[1/4] 브라우저 시작 (headless={headless})...")

            try:
                context = await p.chromium.launch_persistent_context(
                    user_data_dir=str(config.browser_profile),
                    headless=headless,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-infobars',
                        '--no-first-run',
                        '--no-default-browser-check',
                    ],
                    ignore_default_args=['--enable-automation'],
                    viewport={'width': 1280, 'height': 800} if headless else None,
                    no_viewport=not headless,
                )
            except PlaywrightError as e:
                logger.error("브라우저 시작 실패: %s", e, exc_info=True)
                print(f"  ❌ 브라우저 시작 실패: {e}")
                return False

            page = context.pages[0] if context.pages else await context.new_page()

            # NotebookLM으로 이동
            print("[2/4] NotebookLM 접속...")
            try:
                await page.goto(
                    "https://notebooklm.google.com",
                    wait_until='domcontentloaded',
                    timeout=30000
                )
            except PlaywrightTimeoutError:
                logger.warning("NotebookLM 페이지 로드 타임아웃 - 계속 진행")
                print("  ⚠️ 페이지 로드 타임아웃 - 계속 진행...")
            except PlaywrightError as e:
                logger.warning("NotebookLM 페이지 로드 중 오류: %s", e)
                print(f"  ⚠️ 페이지 로드 중... ({e})")

            await asyncio.sleep(3)

            # 로그인 상태 확인 및 대기
            print("[3/4] 로그인 상태 확인...")

            logged_in = False
            start_time = time.time()

            while time.time() - start_time < timeout:
                url = page.url

                # 로그인 페이지로 리다이렉트 되었는지 확인
                if 'accounts.google.com' in url:
                    if headless:
                        print("  ⚠️ 로그인 필요 - headless 모드에서 불가. --headless=False 옵션으로 재시도하세요.")
                        logger.warning("headless 모드에서 로그인 리다이렉트 감지. 수동 로그인 필요.")
                        await context.close()
                        return False
                    else:
                        # 앱 비밀번호가 있으면 자동 입력 시도
                        app_password = config.notebooklm_app_password
                        if app_password:
                            await _try_app_password_login(page, app_password)

                        print("  로그인 페이지 감지 - 대기 중...")
                        await asyncio.sleep(5)
                        continue

                # NotebookLM 메인 페이지에 있는지 확인
                if 'notebooklm.google.com' in url and 'accounts.google' not in url:
                    cookies = await context.cookies()
                    google_cookies = [c for c in cookies if 'google.com' in c.get('domain', '')]
                    cookie_names = {c['name'] for c in google_cookies}
                    has_sid = 'SID' in cookie_names
                    has_psid = '__Secure-1PSID' in cookie_names or '__Secure-3PSID' in cookie_names

                    if has_sid and has_psid and len(google_cookies) > 10:
                        logged_in = True
                        print(f"  ✓ 로그인 확인 (쿠키 {len(google_cookies)}개)")
                        break

                await asyncio.sleep(2)
                elapsed = int(time.time() - start_time)
                print(f"\r  확인 중... {elapsed}초", end="", flush=True)

            if not logged_in:
                print(f"\n  ❌ 로그인 실패 또는 타임아웃 ({timeout}초). "
                      "브라우저 프로필이 유효한지 확인하거나 재로그인하세요.")
                logger.error("로그인 타임아웃: %d초 경과. URL: %s", timeout, page.url)
                await context.close()
                return False

            # 쿠키 추출 및 저장
            print("\n[4/4] 인증 정보 저장...")

            cookies = await context.cookies()

            # 쿠키를 딕셔너리로 변환
            cookies_dict = {}
            for cookie in cookies:
                if 'google.com' in cookie.get('domain', ''):
                    cookies_dict[cookie['name']] = cookie['value']

            # CSRF 토큰 생성
            sapisid = cookies_dict.get('SAPISID', cookies_dict.get('__Secure-3PAPISID', ''))
            csrf_token = f"{sapisid[:16]}:{int(time.time() * 1000)}" if sapisid else ""

            # 세션 ID 추출
            session_id = ""
            current_url = page.url
            if '/notebook/' in current_url:
                parts = current_url.split('/notebook/')
                if len(parts) > 1:
                    session_id = parts[1].split('/')[0].split('?')[0]

            # 루트 auth.json 저장
            auth_data = {
                "cookies": cookies_dict,
                "csrf_token": csrf_token,
                "session_id": session_id,
                "extracted_at": time.time(),
                "auto_login": True
            }

            try:
                with open(config.root_auth_file, 'w', encoding='utf-8') as f:
                    json.dump(auth_data, f, indent=2)
            except OSError as e:
                logger.error("인증 파일 저장 실패: %s → %s", config.root_auth_file, e)
                print(f"  ❌ 인증 파일 저장 실패: {e}")
                await context.close()
                return False

            # 프로필 디렉토리에 동기화
            try:
                sync_to_profile(auth_data)
            except OSError as e:
                logger.warning("프로필 동기화 실패 (비치명적): %s", e)
                print(f"  ⚠️ 프로필 동기화 실패 (계속 진행): {e}")

            print(f"  ✓ 저장 완료")
            print(f"    쿠키: {len(cookies_dict)}개")
            print(f"    파일: {config.root_auth_file}")

            await context.close()

    except Exception as e:
        logger.error("auto_login 예상치 못한 오류: %s", e, exc_info=True)
        print(f"  ❌ 예상치 못한 오류: {e}")
        if context:
            try:
                await context.close()
            except Exception:
                pass
        return False

    print("\n" + "=" * 50)
    print("자동 로그인 완료!")
    print("=" * 50)

    return True


async def _try_app_password_login(page, app_password: str):
    """앱 비밀번호로 로그인 시도"""
    from playwright.async_api import Error as PlaywrightError

    if not app_password:
        logger.debug("앱 비밀번호가 비어 있어 건너뜁니다.")
        return

    try:
        # 비밀번호 입력 필드 찾기
        password_input = await page.query_selector('input[type="password"]')
        if password_input:
            # 앱 비밀번호 입력 (공백 제거)
            clean_password = app_password.replace(' ', '')
            await password_input.fill(clean_password)
            await asyncio.sleep(0.5)

            # 다음 버튼 클릭
            next_btn = await page.query_selector('button:has-text("Next"), button:has-text("다음")')
            if next_btn:
                await next_btn.click()
                await asyncio.sleep(3)
                print("  앱 비밀번호 입력 완료")
            else:
                logger.warning("앱 비밀번호 입력 후 '다음' 버튼을 찾을 수 없습니다.")
        else:
            logger.debug("비밀번호 입력 필드가 페이지에 없습니다.")
    except PlaywrightError as e:
        logger.warning("앱 비밀번호 입력 중 브라우저 오류: %s", e)
        print(f"  ⚠️ 앱 비밀번호 입력 실패 (브라우저 오류): {e}")


def sync_to_profile(auth_data: dict):
    """프로필 디렉토리에 인증 정보 동기화

    Raises:
        OSError: 파일 시스템 오류 발생 시
    """
    if not isinstance(auth_data, dict):
        raise ValueError(f"auth_data must be a dict, got {type(auth_data).__name__}")

    config = get_config()
    config.profile_dir.mkdir(parents=True, exist_ok=True)

    # cookies.json (리스트 형식)
    raw_cookies = auth_data.get('cookies', {})
    if isinstance(raw_cookies, list):
        # 이미 리스트 형식 (Playwright 쿠키)
        cookies_list = raw_cookies
    else:
        # dict 형식 → 리스트로 변환
        cookies_list = [
            {
                "name": name,
                "value": value,
                "domain": ".google.com",
                "path": "/",
                "expires": -1,
                "httpOnly": False,
                "secure": True,
                "sameSite": "Lax"
            }
            for name, value in raw_cookies.items()
        ]

    with open(config.profile_dir / "cookies.json", "w") as f:
        json.dump(cookies_list, f, indent=2)

    # metadata.json (csrf_token은 빈값으로 → 클라이언트가 자동 추출)
    with open(config.profile_dir / "metadata.json", "w") as f:
        json.dump({
            "csrf_token": "",
            "session_id": auth_data.get("session_id", ""),
            "email": "",
            "last_validated": datetime.now().isoformat()
        }, f, indent=2)

    # auth.json
    with open(config.profile_dir / "auth.json", "w") as f:
        json.dump(auth_data, f, indent=2)

    logger.debug("프로필 동기화 완료: %s", config.profile_dir)


def sync_auth() -> bool:
    """인증 동기화 (루트 → 프로필)"""
    config = get_config()

    if not config.root_auth_file.exists():
        logger.debug("루트 인증 파일 없음: %s", config.root_auth_file)
        return False

    try:
        with open(config.root_auth_file, encoding='utf-8') as f:
            root_data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.error("인증 파일 읽기 실패 (%s): %s", config.root_auth_file, e)
        print(f"  ❌ 인증 파일 읽기 실패: {e}")
        return False

    try:
        sync_to_profile(root_data)
    except OSError as e:
        logger.error("프로필 동기화 실패: %s", e)
        print(f"  ❌ 프로필 동기화 실패: {e}")
        return False

    return True


def check_auth() -> bool:
    """인증 확인 (Python API 직접 호출)"""
    sync_auth()
    from .nlm_client import check_nlm_auth
    return check_nlm_auth()


async def ensure_auth() -> bool:
    """인증 확인 및 필요시 자동 로그인 (TTL 만료 자동 감지)"""
    from .nlm_client import is_client_expired, close_nlm_client

    config = get_config()

    # TTL 만료시 클라이언트 리셋 후 재인증
    if is_client_expired():
        print("  NLM 클라이언트 만료 → 재인증...")
        close_nlm_client()

    # 먼저 API로 인증 확인
    if check_auth():
        return True

    # 실패하면 클라이언트 리셋 후 자동 로그인 시도
    print("  인증 만료 - 자동 로그인 시도...")
    close_nlm_client()

    # headless로 먼저 시도
    if await auto_login(headless=True, timeout=30):
        sync_auth()
        return check_auth()

    # 실패하면 브라우저로 시도
    print("  백그라운드 실패 - 브라우저로 재시도...")
    if await auto_login(headless=False, timeout=config.timeout_login):
        sync_auth()
        return check_auth()

    return False


async def ensure_logged_in() -> bool:
    """
    로그인 상태 확인 및 필요시 자동 로그인
    1. API로 인증 확인
    2. Playwright headless
    3. Playwright 브라우저 표시
    """
    # 1. API로 인증 확인
    if check_auth():
        print("  ✓ 기존 인증 유효")
        return True

    # 2. 클라이언트 리셋 후 Playwright headless 시도
    from .nlm_client import close_nlm_client
    close_nlm_client()

    print("자동 로그인 시도...")
    if await auto_login(headless=True, timeout=30):
        sync_auth()
        if check_auth():
            return True

    # 3. 브라우저 표시하여 재시도
    print("\n백그라운드 실패. 브라우저로 재시도...")
    if await auto_login(headless=False, timeout=120):
        sync_auth()
        return check_auth()

    return False


# 동기 버전
def run_auto_login(headless: bool = True) -> bool:
    return asyncio.run(auto_login(headless=headless))


def run_ensure_logged_in() -> bool:
    return asyncio.run(ensure_logged_in())
