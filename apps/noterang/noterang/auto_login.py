#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 완전 자동 로그인 모듈
- Google 2FA TOTP 자동 생성
- 브라우저 자동화로 NotebookLM 로그인
"""
import asyncio
import logging
import os
import sys
import time
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import pyotp
from playwright.async_api import async_playwright, Error as PlaywrightError, TimeoutError as PlaywrightTimeoutError
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# .env.local 파일 로드
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# 인증 정보 (환경 변수에서 로드)
EMAIL = os.getenv('GOOGLE_EMAIL', '')
PASSWORD = os.getenv('GOOGLE_PASSWORD', '')
TOTP_SECRET = os.getenv('GOOGLE_2FA_SECRET', '')
APP_PASSWORD = os.getenv('NOTEBOOKLM_APP_PASSWORD', '')
APIFY_API_KEY = os.getenv('APIFY_API_KEY', '')

# 브라우저 프로필 경로
BROWSER_PROFILE = Path.home() / '.notebooklm-auto-v3'


def get_totp_code() -> str:
    """현재 TOTP 코드 생성

    Raises:
        EnvironmentError: GOOGLE_2FA_SECRET 환경 변수가 설정되지 않은 경우
        ValueError: TOTP 시크릿이 유효하지 않은 경우
    """
    if not TOTP_SECRET:
        raise EnvironmentError(
            "GOOGLE_2FA_SECRET 환경 변수가 설정되지 않았습니다. "
            ".env.local 파일에 GOOGLE_2FA_SECRET=<secret>을 추가하세요."
        )
    try:
        totp = pyotp.TOTP(TOTP_SECRET.upper())
        return totp.now()
    except Exception as e:
        raise ValueError(f"TOTP 코드 생성 실패 (시크릿 형식이 잘못되었을 수 있습니다): {e}") from e


async def full_auto_login(headless: bool = False) -> bool:
    """
    완전 자동 로그인

    Args:
        headless: True면 백그라운드 실행

    Returns:
        로그인 성공 여부
    """
    # 사용자 오류: 필수 환경 변수 검증 (조기 실패)
    missing_vars = [v for v, val in [('GOOGLE_EMAIL', EMAIL), ('GOOGLE_PASSWORD', PASSWORD)] if not val]
    if missing_vars:
        print(f"  ❌ 필수 환경 변수가 없습니다: {', '.join(missing_vars)}")
        print("  .env.local 파일에 해당 변수를 설정하세요.")
        logger.error("필수 환경 변수 누락: %s", missing_vars)
        return False

    print("=" * 50)
    print("NotebookLM 완전 자동 로그인")
    print("=" * 50)

    context = None
    try:
        async with async_playwright() as p:
            try:
                context = await p.chromium.launch_persistent_context(
                    user_data_dir=str(BROWSER_PROFILE),
                    headless=headless,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-infobars',
                    ],
                    viewport={'width': 1280, 'height': 900},
                )
            except PlaywrightError as e:
                logger.error("브라우저 시작 실패: %s", e, exc_info=True)
                print(f"  ❌ 브라우저 시작 실패: {e}")
                return False

            page = context.pages[0] if context.pages else await context.new_page()

            # 1. NotebookLM 접속
            print("\n[1/4] NotebookLM 접속...")
            try:
                await page.goto('https://notebooklm.google.com/', timeout=60000)
            except PlaywrightTimeoutError:
                logger.warning("NotebookLM 접속 타임아웃 - 계속 진행")
                print("  ⚠️ 접속 타임아웃 - 계속 진행...")
            except PlaywrightError as e:
                logger.error("NotebookLM 접속 실패: %s", e)
                print(f"  ❌ NotebookLM 접속 실패: {e}. 네트워크 연결을 확인하세요.")
                await context.close()
                return False

            await asyncio.sleep(3)

            # 이미 로그인된 경우
            if 'notebooklm.google.com' in page.url and 'accounts' not in page.url:
                print("  ✓ 이미 로그인되어 있습니다.")
                await context.close()
                return True

            # 2. 이메일 입력
            if 'accounts.google.com' in page.url:
                print("[2/4] 이메일 입력...")
                try:
                    await page.wait_for_selector('input[type="email"]', timeout=10000)
                    await page.fill('input[type="email"]', EMAIL)
                    await page.click('#identifierNext')
                    await asyncio.sleep(4)
                    print("  ✓ 이메일 입력 완료")
                except PlaywrightTimeoutError:
                    logger.error("이메일 입력 필드 타임아웃 - 페이지 구조가 변경되었을 수 있음")
                    print("  ❌ 이메일 입력 필드를 찾을 수 없습니다 (페이지 구조가 변경되었을 수 있습니다).")
                    await context.close()
                    return False
                except PlaywrightError as e:
                    logger.error("이메일 입력 실패: %s", e, exc_info=True)
                    print(f"  ❌ 이메일 입력 실패: {e}")
                    await context.close()
                    return False

            # 3. 비밀번호 입력
            print("[3/4] 비밀번호 입력...")
            try:
                await page.wait_for_selector('input[type="password"]', timeout=10000)
                await page.fill('input[type="password"]', PASSWORD)
                await page.click('#passwordNext')
                await asyncio.sleep(4)
                print("  ✓ 비밀번호 입력 완료")
            except PlaywrightTimeoutError:
                logger.error("비밀번호 입력 필드 타임아웃")
                print("  ❌ 비밀번호 입력 필드를 찾을 수 없습니다. 이메일 주소가 올바른지 확인하세요.")
                await context.close()
                return False
            except PlaywrightError as e:
                logger.error("비밀번호 입력 실패: %s", e, exc_info=True)
                print(f"  ❌ 비밀번호 입력 실패: {e}")
                await context.close()
                return False

            # 4. 2FA TOTP 입력
            print("[4/4] 2FA 코드 입력...")
            try:
                await asyncio.sleep(2)

                # 먼저 TOTP 입력 필드가 있는지 확인
                totp_input = await page.query_selector(
                    'input[name="totpPin"], input[type="tel"][autocomplete="one-time-code"], input[id="totpPin"]'
                )

                # TOTP 필드가 없으면 "다른 방법 시도" 클릭
                if not totp_input:
                    print("  Push 알림 방식 감지, OTP 방식으로 전환...")

                    # "다른 방법 시도" 클릭 - 텍스트로 직접 찾기
                    switched = False
                    for text_sel in ('text=다른 방법 시도', 'text=Try another way'):
                        try:
                            await page.click(text_sel, timeout=5000)
                            await asyncio.sleep(2)
                            print(f"  ✓ '{text_sel}' 클릭")
                            switched = True
                            break
                        except PlaywrightError:
                            continue

                    if not switched:
                        logger.warning("'다른 방법 시도' 버튼을 찾을 수 없습니다.")

                    # OTP/Authenticator 앱 옵션 선택
                    otp_options = [
                        'text=Google OTP',
                        'text=Authenticator',
                        'text=인증 앱',
                        'text=OTP 앱',
                        '[data-challengetype="6"]',  # TOTP
                        '[data-challengetype="5"]',
                    ]
                    for selector in otp_options:
                        try:
                            await page.click(selector, timeout=2000)
                            print(f"  ✓ OTP 방식 선택: {selector}")
                            await asyncio.sleep(3)
                            break
                        except PlaywrightError:
                            continue

                    # 다시 TOTP 필드 찾기
                    try:
                        totp_input = await page.wait_for_selector(
                            'input[name="totpPin"], input[type="tel"], input[id="totpPin"], input[autocomplete="one-time-code"]',
                            timeout=10000
                        )
                    except PlaywrightTimeoutError:
                        logger.warning("TOTP 입력 필드를 찾을 수 없음 - 2FA 미설정 또는 이미 인증됨")
                        print("  ⚠️ TOTP 입력 필드를 찾을 수 없습니다")
                        totp_input = None

                if totp_input:
                    # TOTP 코드 생성
                    try:
                        code = get_totp_code()
                    except (EnvironmentError, ValueError) as e:
                        logger.error("TOTP 코드 생성 실패: %s", e)
                        print(f"  ❌ TOTP 코드 생성 실패: {e}")
                        await context.close()
                        return False

                    print(f"  생성된 코드: {code}")
                    await totp_input.fill(code)
                    await asyncio.sleep(1)

                    # 다음 버튼 클릭
                    next_btn = await page.query_selector(
                        '#totpNext, button:has-text("다음"), button:has-text("Next")'
                    )
                    if next_btn:
                        await next_btn.click()
                        await asyncio.sleep(5)
                        print("  ✓ 2FA 코드 입력 완료")
                    else:
                        logger.warning("2FA '다음' 버튼을 찾을 수 없음")
                        print("  ⚠️ 2FA '다음' 버튼을 찾을 수 없음")
                else:
                    print("  ⚠️ TOTP 입력 필드를 찾지 못함 - 이미 인증됨으로 간주")

            except PlaywrightError as e:
                # 2FA 오류는 치명적이지 않을 수 있으므로 경고만 출력하고 계속
                logger.warning("2FA 입력 중 오류 (이미 인증됨일 수 있음): %s", e)
                print(f"  ⚠️ 2FA 입력 건너뜀 (이미 인증됨 또는 불필요): {e}")

            # 로그인 결과 확인
            print("\n로그인 결과 확인...")
            for i in range(10):
                await asyncio.sleep(2)
                if 'notebooklm.google.com' in page.url and 'accounts' not in page.url:
                    print("✓ 로그인 성공!")
                    await context.close()
                    return True
                print(f"  대기 중... {(i+1)*2}초")

            print("❌ 로그인 실패. 비밀번호 또는 2FA 설정을 확인하세요.")
            logger.error("로그인 최종 실패. 현재 URL: %s", page.url)
            try:
                screenshot_path = str(BROWSER_PROFILE.parent / 'login_failed.png')
                await page.screenshot(path=screenshot_path)
                print(f"  스크린샷 저장: {screenshot_path}")
            except PlaywrightError:
                pass
            await context.close()
            return False

    except Exception as e:
        logger.error("full_auto_login 예상치 못한 오류: %s", e, exc_info=True)
        print(f"  ❌ 예상치 못한 오류: {e}")
        if context:
            try:
                await context.close()
            except Exception:
                pass
        return False


async def login_and_get_context():
    """
    로그인 후 브라우저 컨텍스트 반환 (다른 작업용)

    Note: 반환된 playwright 인스턴스와 context는 호출자가 직접 닫아야 합니다.
          playwright.stop() 및 context.close()를 반드시 호출하세요.

    Returns:
        (playwright, context, page) 또는 (None, None, None)
    """
    playwright = await async_playwright().start()
    context = await playwright.chromium.launch_persistent_context(
        user_data_dir=str(BROWSER_PROFILE),
        headless=False,
        args=['--disable-blink-features=AutomationControlled'],
        viewport={'width': 1280, 'height': 900},
    )
    page = context.pages[0] if context.pages else await context.new_page()

    try:
        await page.goto('https://notebooklm.google.com/', timeout=60000)
        await asyncio.sleep(3)

        # 로그인 필요시
        if 'accounts.google.com' in page.url:
            success = await full_auto_login(headless=False)
            if not success:
                await context.close()
                await playwright.stop()
                return None, None, None

            # 기존 컨텍스트 닫고 새로 열기 (로그인 후 프로필 세션 반영)
            await context.close()
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=str(BROWSER_PROFILE),
                headless=False,
                args=['--disable-blink-features=AutomationControlled'],
                viewport={'width': 1280, 'height': 900},
            )
            page = context.pages[0] if context.pages else await context.new_page()
            await page.goto('https://notebooklm.google.com/', timeout=60000)
            await asyncio.sleep(3)

        return playwright, context, page
    except Exception as e:
        logger.error("login_and_get_context 실패: %s", e)
        try:
            await context.close()
        except Exception:
            pass
        try:
            await playwright.stop()
        except Exception:
            pass
        return None, None, None


# CLI 실행
if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='NotebookLM 자동 로그인')
    parser.add_argument('--headless', action='store_true', help='백그라운드 실행')
    parser.add_argument('--test-totp', action='store_true', help='TOTP 코드만 테스트')
    args = parser.parse_args()

    if args.test_totp:
        print(f"현재 TOTP 코드: {get_totp_code()}")
    else:
        result = asyncio.run(full_auto_login(headless=args.headless))
        print(f"\n결과: {'성공' if result else '실패'}")
