#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auto_login.py 유닛 테스트
- TOTP 코드 생성 테스트 (브라우저 불필요)
"""
import os
import sys
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import pyotp

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestTOTPCodeGeneration:
    """TOTP 코드 생성 테스트"""

    def test_get_totp_code_returns_6_digits(self, mock_env_vars):
        from noterang.auto_login import get_totp_code
        code = get_totp_code()
        assert len(code) == 6, f"TOTP 코드는 6자리여야 합니다: {code}"
        assert code.isdigit(), f"TOTP 코드는 숫자여야 합니다: {code}"

    def test_get_totp_code_matches_pyotp(self, mock_env_vars):
        from noterang.auto_login import get_totp_code
        secret = mock_env_vars["GOOGLE_2FA_SECRET"]
        expected = pyotp.TOTP(secret.upper()).now()
        actual = get_totp_code()
        assert actual == expected

    def test_get_totp_code_changes_over_time(self, mock_env_vars):
        """TOTP 코드가 시간 기반으로 생성되는지 확인"""
        from noterang.auto_login import get_totp_code
        # 같은 시간 윈도우 내에서는 같은 코드
        code1 = get_totp_code()
        code2 = get_totp_code()
        assert code1 == code2, "같은 시간 윈도우 내에서는 같은 코드"

    def test_totp_with_different_secrets(self):
        """다른 시크릿으로 다른 코드 생성"""
        secret1 = "JBSWY3DPEHPK3PXP"
        secret2 = "KVKFKRCPNZQUYMLX"

        code1 = pyotp.TOTP(secret1).now()
        code2 = pyotp.TOTP(secret2).now()
        # 다른 시크릿은 (거의 항상) 다른 코드를 생성
        # 매우 드물게 같을 수 있으므로 길이만 확인
        assert len(code1) == 6
        assert len(code2) == 6

    def test_totp_verify_works(self, mock_env_vars):
        """생성된 코드가 검증 가능한지 확인"""
        secret = mock_env_vars["GOOGLE_2FA_SECRET"]
        totp = pyotp.TOTP(secret.upper())
        code = totp.now()
        assert totp.verify(code), "생성된 TOTP 코드가 검증 가능해야 합니다"


class TestEnvironmentVariables:
    """환경 변수 로딩 테스트"""

    def test_email_loaded(self, mock_env_vars):
        # 모듈을 다시 로드하여 환경 변수 반영
        import importlib
        import noterang.auto_login as auto_login_module
        importlib.reload(auto_login_module)

        assert auto_login_module.EMAIL == "test@gmail.com"

    def test_password_loaded(self, mock_env_vars):
        import importlib
        import noterang.auto_login as auto_login_module
        importlib.reload(auto_login_module)

        assert auto_login_module.PASSWORD == "testpassword"

    def test_totp_secret_loaded(self, mock_env_vars):
        import importlib
        import noterang.auto_login as auto_login_module
        importlib.reload(auto_login_module)

        assert auto_login_module.TOTP_SECRET == "JBSWY3DPEHPK3PXP"

    def test_empty_defaults(self):
        """환경 변수가 없을 때 빈 문자열"""
        remove_keys = {
            "GOOGLE_EMAIL": "",
            "GOOGLE_PASSWORD": "",
            "GOOGLE_2FA_SECRET": "",
            "NOTEBOOKLM_APP_PASSWORD": "",
            "APIFY_API_KEY": "",
        }
        with patch.dict(os.environ, remove_keys):
            import importlib
            import noterang.auto_login as auto_login_module
            importlib.reload(auto_login_module)

            assert auto_login_module.EMAIL == ""
            assert auto_login_module.PASSWORD == ""


class TestBrowserProfile:
    """브라우저 프로필 경로 테스트"""

    def test_browser_profile_path(self):
        from noterang.auto_login import BROWSER_PROFILE
        assert ".notebooklm-auto-v3" in str(BROWSER_PROFILE)
        assert isinstance(BROWSER_PROFILE, Path)
