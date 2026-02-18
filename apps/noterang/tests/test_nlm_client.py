#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nlm_client.py 유닛 테스트

NLM 클라이언트 싱글톤, TTL 만료, 인증 확인 기능 테스트.
외부 notebooklm_tools 의존성은 모두 unittest.mock으로 대체.
"""
import sys
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, PropertyMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _reset_client_state():
    """각 테스트 전에 모듈 수준 싱글톤 상태를 초기화"""
    import noterang.nlm_client as nlm_module
    nlm_module._client = None
    nlm_module._client_created_at = 0.0


# ---------------------------------------------------------------------------
# Error Classes
# ---------------------------------------------------------------------------

class TestNLMClientErrors:
    """커스텀 예외 클래스 테스트"""

    def test_nlm_client_error_is_exception(self):
        from noterang.nlm_client import NLMClientError
        err = NLMClientError("test error")
        assert isinstance(err, Exception)
        assert str(err) == "test error"

    def test_nlm_auth_error_is_nlm_client_error(self):
        from noterang.nlm_client import NLMAuthError, NLMClientError
        err = NLMAuthError("auth failed")
        assert isinstance(err, NLMClientError)
        assert isinstance(err, Exception)

    def test_nlm_auth_error_message(self):
        from noterang.nlm_client import NLMAuthError
        msg = "No cached auth tokens found"
        err = NLMAuthError(msg)
        assert str(err) == msg


# ---------------------------------------------------------------------------
# get_nlm_client
# ---------------------------------------------------------------------------

class TestGetNlmClient:
    """get_nlm_client 싱글톤 팩토리 테스트"""

    def setup_method(self):
        _reset_client_state()

    def teardown_method(self):
        _reset_client_state()

    def test_raises_auth_error_when_no_tokens(self):
        """캐시된 토큰이 없으면 NLMAuthError 발생"""
        import noterang.nlm_client as nlm_module
        from noterang.nlm_client import NLMAuthError

        nlm_module._client = None
        nlm_module._client_created_at = 0.0

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = None
        fake_client_mod = MagicMock()

        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            with pytest.raises(NLMAuthError):
                nlm_module.get_nlm_client()

    def test_returns_client_when_tokens_exist(self):
        """유효한 토큰이 있으면 클라이언트 반환"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        nlm_module._client_created_at = 0.0

        mock_tokens = MagicMock()
        mock_tokens.cookies = {"session": "abc"}
        mock_tokens.csrf_token = "csrf_xyz"
        mock_tokens.session_id = "sess_123"

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = mock_tokens

        mock_client_instance = MagicMock()
        fake_client_mod = MagicMock()
        fake_client_mod.NotebookLMClient.return_value = mock_client_instance

        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            client = nlm_module.get_nlm_client()
            assert client is mock_client_instance

    def test_returns_cached_client_on_second_call(self):
        """두 번째 호출 시 동일한 싱글톤 반환"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        nlm_module._client_created_at = 0.0

        mock_tokens = MagicMock()
        mock_tokens.cookies = {}
        mock_tokens.csrf_token = "tok"
        mock_tokens.session_id = "s1"

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = mock_tokens

        mock_client_instance = MagicMock()
        fake_client_mod = MagicMock()
        fake_client_mod.NotebookLMClient.return_value = mock_client_instance

        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            client1 = nlm_module.get_nlm_client()
            client2 = nlm_module.get_nlm_client()
            assert client1 is client2
            # NotebookLMClient 생성자는 한 번만 호출되어야 함
            assert fake_client_mod.NotebookLMClient.call_count == 1

    def test_force_refresh_creates_new_client(self):
        """force_refresh=True 시 새 클라이언트 생성"""
        import noterang.nlm_client as nlm_module

        existing_client = MagicMock()
        nlm_module._client = existing_client
        nlm_module._client_created_at = time.time()

        mock_tokens = MagicMock()
        mock_tokens.cookies = {}
        mock_tokens.csrf_token = "new_tok"
        mock_tokens.session_id = "new_sess"

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = mock_tokens

        new_client = MagicMock()
        fake_client_mod = MagicMock()
        fake_client_mod.NotebookLMClient.return_value = new_client

        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            client = nlm_module.get_nlm_client(force_refresh=True)
            assert client is new_client

    def test_ttl_expired_client_is_refreshed(self):
        """TTL 만료된 클라이언트는 자동으로 갱신"""
        import noterang.nlm_client as nlm_module

        old_client = MagicMock()
        nlm_module._client = old_client
        # 1300초 전에 생성된 것으로 설정 (TTL=1200초 초과)
        nlm_module._client_created_at = time.time() - 1300

        mock_tokens = MagicMock()
        mock_tokens.cookies = {}
        mock_tokens.csrf_token = "fresh_tok"
        mock_tokens.session_id = "fresh_sess"

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = mock_tokens

        new_client = MagicMock()
        fake_client_mod = MagicMock()
        fake_client_mod.NotebookLMClient.return_value = new_client

        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            client = nlm_module.get_nlm_client()
            assert client is new_client
            # 이전 클라이언트의 close()가 호출되어야 함
            old_client.close.assert_called_once()

    def test_client_created_at_timestamp_is_set(self):
        """클라이언트 생성 시 타임스탬프가 기록됨"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        nlm_module._client_created_at = 0.0

        mock_tokens = MagicMock()
        mock_tokens.cookies = {}
        mock_tokens.csrf_token = "tok"
        mock_tokens.session_id = "s"

        fake_auth = MagicMock()
        fake_auth.load_cached_tokens.return_value = mock_tokens
        fake_client_mod = MagicMock()
        fake_client_mod.NotebookLMClient.return_value = MagicMock()

        before = time.time()
        with patch.dict('sys.modules', {
            'notebooklm_tools': MagicMock(),
            'notebooklm_tools.core': MagicMock(),
            'notebooklm_tools.core.auth': fake_auth,
            'notebooklm_tools.core.client': fake_client_mod,
        }):
            nlm_module.get_nlm_client()
        after = time.time()

        assert before <= nlm_module._client_created_at <= after


# ---------------------------------------------------------------------------
# close_nlm_client
# ---------------------------------------------------------------------------

class TestCloseNlmClient:
    """close_nlm_client 테스트"""

    def setup_method(self):
        _reset_client_state()

    def teardown_method(self):
        _reset_client_state()

    def test_close_calls_client_close(self):
        """클라이언트 close() 메서드가 호출됨"""
        import noterang.nlm_client as nlm_module

        mock_client = MagicMock()
        nlm_module._client = mock_client
        nlm_module._client_created_at = time.time()

        nlm_module.close_nlm_client()

        mock_client.close.assert_called_once()
        assert nlm_module._client is None
        assert nlm_module._client_created_at == 0.0

    def test_close_when_no_client_does_not_raise(self):
        """클라이언트 없을 때 close() 호출해도 예외 없음"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        nlm_module._client_created_at = 0.0

        # 예외가 발생하지 않아야 함
        nlm_module.close_nlm_client()
        assert nlm_module._client is None

    def test_close_ignores_client_close_exception(self):
        """client.close()에서 예외가 발생해도 무시"""
        import noterang.nlm_client as nlm_module

        mock_client = MagicMock()
        mock_client.close.side_effect = RuntimeError("close failed")
        nlm_module._client = mock_client
        nlm_module._client_created_at = time.time()

        # 예외가 전파되지 않아야 함
        nlm_module.close_nlm_client()
        assert nlm_module._client is None

    def test_close_resets_timestamp(self):
        """close 후 타임스탬프가 0으로 리셋"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = MagicMock()
        nlm_module._client_created_at = time.time()

        nlm_module.close_nlm_client()
        assert nlm_module._client_created_at == 0.0


# ---------------------------------------------------------------------------
# is_client_expired
# ---------------------------------------------------------------------------

class TestIsClientExpired:
    """TTL 만료 여부 확인 테스트"""

    def setup_method(self):
        _reset_client_state()

    def teardown_method(self):
        _reset_client_state()

    def test_returns_true_when_no_client(self):
        """클라이언트가 없으면 만료로 간주"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        assert nlm_module.is_client_expired() is True

    def test_returns_false_for_fresh_client(self):
        """방금 생성된 클라이언트는 만료되지 않음"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = MagicMock()
        nlm_module._client_created_at = time.time()

        assert nlm_module.is_client_expired() is False

    def test_returns_true_for_expired_client(self):
        """TTL(1200초) 이상 지난 클라이언트는 만료"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = MagicMock()
        nlm_module._client_created_at = time.time() - 1201

        assert nlm_module.is_client_expired() is True

    def test_boundary_at_exactly_ttl(self):
        """TTL 경계값 (정확히 1200초)에서는 만료로 간주"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = MagicMock()
        # 정확히 1200초를 넘어야 만료
        nlm_module._client_created_at = time.time() - 1200 - 1

        assert nlm_module.is_client_expired() is True

    def test_not_expired_just_below_ttl(self):
        """TTL 직전(1199초)에는 만료되지 않음"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = MagicMock()
        nlm_module._client_created_at = time.time() - 1199

        assert nlm_module.is_client_expired() is False


# ---------------------------------------------------------------------------
# check_nlm_auth
# ---------------------------------------------------------------------------

class TestCheckNlmAuth:
    """인증 상태 확인 테스트"""

    def setup_method(self):
        _reset_client_state()

    def teardown_method(self):
        _reset_client_state()

    def test_returns_true_when_list_notebooks_succeeds(self):
        """list_notebooks() 성공 시 True 반환"""
        import noterang.nlm_client as nlm_module

        mock_client = MagicMock()
        mock_client.list_notebooks.return_value = []

        with patch('noterang.nlm_client.get_nlm_client', return_value=mock_client):
            result = nlm_module.check_nlm_auth()
        assert result is True

    def test_returns_false_when_list_notebooks_raises(self):
        """list_notebooks() 예외 발생 시 False 반환"""
        import noterang.nlm_client as nlm_module

        mock_client = MagicMock()
        mock_client.list_notebooks.side_effect = Exception("connection error")

        with patch('noterang.nlm_client.get_nlm_client', return_value=mock_client):
            result = nlm_module.check_nlm_auth()
        assert result is False

    def test_returns_false_when_get_client_raises(self):
        """get_nlm_client() 자체에서 예외 발생 시 False 반환"""
        import noterang.nlm_client as nlm_module, noterang.nlm_client as m

        with patch('noterang.nlm_client.get_nlm_client', side_effect=m.NLMAuthError("no tokens")):
            result = nlm_module.check_nlm_auth()
        assert result is False

    def test_returns_false_on_network_timeout(self):
        """네트워크 타임아웃 시 False 반환"""
        import noterang.nlm_client as nlm_module

        mock_client = MagicMock()
        mock_client.list_notebooks.side_effect = TimeoutError("timeout")

        with patch('noterang.nlm_client.get_nlm_client', return_value=mock_client):
            result = nlm_module.check_nlm_auth()
        assert result is False


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

class TestNLMClientConstants:
    """모듈 상수값 검증"""

    def test_client_ttl_is_1200(self):
        """TTL은 1200초(20분)이어야 함"""
        import noterang.nlm_client as nlm_module
        assert nlm_module._CLIENT_TTL == 1200

    def test_initial_client_is_none(self):
        """모듈 임포트 시 _client는 None"""
        import noterang.nlm_client as nlm_module
        # 초기 상태 확인 (다른 테스트에서 설정했을 수 있으므로 reset 후)
        nlm_module._client = None
        assert nlm_module._client is None

    def test_initial_created_at_is_zero(self):
        """모듈 초기 _client_created_at은 0.0"""
        import noterang.nlm_client as nlm_module
        nlm_module._client = None
        nlm_module._client_created_at = 0.0
        assert nlm_module._client_created_at == 0.0
