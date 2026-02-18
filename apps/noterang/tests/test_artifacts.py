#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
artifacts.py 유닛 테스트

슬라이드/인포그래픽 생성, 상태 확인, 완료 대기 기능 테스트.
nlm_client와 config는 unittest.mock으로 대체.
asyncio 함수는 pytest-asyncio로 테스트.
"""
import asyncio
import sys
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock, call

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))


# ---------------------------------------------------------------------------
# create_slides
# ---------------------------------------------------------------------------

class TestCreateSlides:
    """create_slides() 함수 테스트"""

    def test_returns_artifact_id_on_success(self, mock_config):
        """성공 시 artifact_id 반환"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {"artifact_id": "art-abc-12345678"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                result = create_slides("nb-001")
        assert result == "art-abc-12345678"

    def test_uses_config_language_when_none_specified(self, mock_config):
        """language=None이면 config.default_language 사용"""
        mock_config.default_language = "ko"
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {"artifact_id": "art-1"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                create_slides("nb-001", language=None)

        _, kwargs = mock_client.create_slide_deck.call_args
        assert kwargs.get("language") == "ko"

    def test_uses_explicit_language(self, mock_config):
        """명시적 language가 제공되면 사용"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {"artifact_id": "art-1"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                create_slides("nb-001", language="en")

        _, kwargs = mock_client.create_slide_deck.call_args
        assert kwargs.get("language") == "en"

    def test_passes_focus_prompt(self, mock_config):
        """focus 파라미터가 focus_prompt로 전달됨"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {"artifact_id": "art-1"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                create_slides("nb-001", focus="정형외과 중심")

        _, kwargs = mock_client.create_slide_deck.call_args
        assert kwargs.get("focus_prompt") == "정형외과 중심"

    def test_empty_focus_prompt_when_none(self, mock_config):
        """focus=None이면 빈 문자열로 전달"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {"artifact_id": "art-1"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                create_slides("nb-001", focus=None)

        _, kwargs = mock_client.create_slide_deck.call_args
        assert kwargs.get("focus_prompt") == ""

    def test_returns_none_when_no_artifact_id(self, mock_config):
        """결과에 artifact_id 없으면 None 반환"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = {}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                result = create_slides("nb-001")
        assert result is None

    def test_returns_none_when_result_is_none(self, mock_config):
        """클라이언트가 None 반환 시 None"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.return_value = None

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                result = create_slides("nb-001")
        assert result is None

    def test_returns_none_on_exception(self, mock_config):
        """예외 발생 시 None 반환"""
        mock_client = MagicMock()
        mock_client.create_slide_deck.side_effect = Exception("API error")

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_slides
                result = create_slides("nb-001")
        assert result is None


# ---------------------------------------------------------------------------
# create_infographic
# ---------------------------------------------------------------------------

class TestCreateInfographic:
    """create_infographic() 함수 테스트"""

    def test_returns_artifact_id_on_success(self, mock_config):
        """성공 시 artifact_id 반환"""
        mock_client = MagicMock()
        mock_client.create_infographic.return_value = {"artifact_id": "infographic-id-001"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_infographic
                result = create_infographic("nb-001")
        assert result == "infographic-id-001"

    def test_uses_config_language_when_none(self, mock_config):
        """language=None이면 config.default_language 사용"""
        mock_config.default_language = "ko"
        mock_client = MagicMock()
        mock_client.create_infographic.return_value = {"artifact_id": "art"}

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_infographic
                create_infographic("nb-001", language=None)

        _, kwargs = mock_client.create_infographic.call_args
        assert kwargs.get("language") == "ko"

    def test_returns_none_on_exception(self, mock_config):
        """예외 발생 시 None 반환"""
        mock_client = MagicMock()
        mock_client.create_infographic.side_effect = RuntimeError("infographic error")

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
                from noterang.artifacts import create_infographic
                result = create_infographic("nb-001")
        assert result is None


# ---------------------------------------------------------------------------
# check_studio_status
# ---------------------------------------------------------------------------

class TestCheckStudioStatus:
    """check_studio_status() 함수 테스트"""

    def test_returns_completed_status(self, mock_config):
        """'completed' 상태 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.return_value = [
            {"status": "completed", "artifact_id": "art-1"}
        ]

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert status == "completed"
        assert data.get("artifact_id") == "art-1"

    def test_returns_in_progress_status(self, mock_config):
        """'in_progress' 상태 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.return_value = [
            {"status": "in_progress"}
        ]

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert status == "in_progress"

    def test_returns_unknown_when_no_artifacts(self, mock_config):
        """아티팩트 없으면 'unknown' 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.return_value = []

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert status == "unknown"
        assert "error" in data

    def test_returns_unknown_when_none(self, mock_config):
        """poll_studio_status가 None이면 'unknown' 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.return_value = None

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert status == "unknown"

    def test_returns_unknown_on_exception(self, mock_config):
        """예외 발생 시 ('unknown', {error}) 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.side_effect = Exception("polling error")

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert status == "unknown"
        assert "error" in data

    def test_returns_latest_artifact_first(self, mock_config):
        """여러 아티팩트 중 첫 번째(가장 최신) 반환"""
        mock_client = MagicMock()
        mock_client.poll_studio_status.return_value = [
            {"status": "completed", "artifact_id": "latest"},
            {"status": "in_progress", "artifact_id": "older"},
        ]

        with patch('noterang.artifacts.get_nlm_client', return_value=mock_client):
            from noterang.artifacts import check_studio_status
            status, data = check_studio_status("nb-001")

        assert data.get("artifact_id") == "latest"


# ---------------------------------------------------------------------------
# is_generation_complete
# ---------------------------------------------------------------------------

class TestIsGenerationComplete:
    """is_generation_complete() 함수 테스트"""

    def test_returns_true_when_completed(self, mock_config):
        with patch('noterang.artifacts.check_studio_status', return_value=("completed", {})):
            from noterang.artifacts import is_generation_complete
            assert is_generation_complete("nb-001") is True

    def test_returns_false_when_in_progress(self, mock_config):
        with patch('noterang.artifacts.check_studio_status', return_value=("in_progress", {})):
            from noterang.artifacts import is_generation_complete
            assert is_generation_complete("nb-001") is False

    def test_returns_false_when_failed(self, mock_config):
        with patch('noterang.artifacts.check_studio_status', return_value=("failed", {})):
            from noterang.artifacts import is_generation_complete
            assert is_generation_complete("nb-001") is False

    def test_returns_false_when_unknown(self, mock_config):
        with patch('noterang.artifacts.check_studio_status', return_value=("unknown", {})):
            from noterang.artifacts import is_generation_complete
            assert is_generation_complete("nb-001") is False


# ---------------------------------------------------------------------------
# wait_for_completion (async)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestWaitForCompletion:
    """wait_for_completion() 비동기 함수 테스트"""

    async def test_returns_true_when_completed_immediately(self, mock_config):
        """첫 번째 체크에서 완료 시 True 반환"""
        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.check_studio_status', return_value=("completed", {})):
                with patch('asyncio.sleep', new=AsyncMock()):
                    from noterang.artifacts import wait_for_completion
                    result = await wait_for_completion("nb-001", timeout=60, check_interval=1)
        assert result is True

    async def test_returns_false_when_failed(self, mock_config):
        """'failed' 상태 시 False 반환"""
        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.check_studio_status', return_value=("failed", {})):
                with patch('asyncio.sleep', new=AsyncMock()):
                    from noterang.artifacts import wait_for_completion
                    result = await wait_for_completion("nb-001", timeout=60, check_interval=1)
        assert result is False

    async def test_timeout_returns_false(self, mock_config):
        """타임아웃 시 False 반환"""
        mock_config.timeout_slides = 1  # 매우 짧은 타임아웃

        call_count = 0

        async def mock_sleep(interval):
            nonlocal call_count
            call_count += 1
            if call_count > 2:
                return

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            # 항상 in_progress 반환
            with patch('noterang.artifacts.check_studio_status', return_value=("in_progress", {})):
                with patch('time.time') as mock_time:
                    # 첫 번째 호출은 start_time, 이후에는 timeout 초과
                    mock_time.side_effect = [0.0, 2.0, 2.0, 2.0]
                    with patch('asyncio.sleep', new=AsyncMock()):
                        from noterang.artifacts import wait_for_completion
                        result = await wait_for_completion("nb-001", timeout=1, check_interval=1)
        assert result is False

    async def test_calls_on_progress_callback(self, mock_config):
        """on_progress 콜백이 호출됨"""
        progress_calls = []

        def on_prog(elapsed, status):
            progress_calls.append((elapsed, status))

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.check_studio_status', return_value=("completed", {})):
                with patch('asyncio.sleep', new=AsyncMock()):
                    with patch('time.time') as mock_time:
                        mock_time.side_effect = [0.0, 5.0, 5.0]
                        from noterang.artifacts import wait_for_completion
                        await wait_for_completion(
                            "nb-001", timeout=600, check_interval=1, on_progress=on_prog
                        )

        assert len(progress_calls) >= 1

    async def test_uses_config_timeout_when_none_specified(self, mock_config):
        """timeout=None이면 config.timeout_slides 사용"""
        mock_config.timeout_slides = 600

        with patch('noterang.artifacts.get_config', return_value=mock_config):
            with patch('noterang.artifacts.check_studio_status', return_value=("completed", {})):
                with patch('asyncio.sleep', new=AsyncMock()):
                    from noterang.artifacts import wait_for_completion
                    result = await wait_for_completion("nb-001", timeout=None, check_interval=1)
        # config.timeout_slides=600이므로 첫 체크에서 완료
        assert result is True


# ---------------------------------------------------------------------------
# create_slides_and_wait (async)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCreateSlidesAndWait:
    """create_slides_and_wait() 비동기 함수 테스트"""

    async def test_returns_artifact_id_when_successful(self, mock_config):
        """슬라이드 생성 + 완료 대기 성공 시 artifact_id 반환"""
        with patch('noterang.artifacts.create_slides', return_value="art-001"):
            with patch('noterang.artifacts.wait_for_completion', new=AsyncMock(return_value=True)):
                from noterang.artifacts import create_slides_and_wait
                result = await create_slides_and_wait("nb-001")
        assert result == "art-001"

    async def test_returns_none_when_slides_creation_fails(self, mock_config):
        """슬라이드 생성 실패 시 None"""
        with patch('noterang.artifacts.create_slides', return_value=None):
            from noterang.artifacts import create_slides_and_wait
            result = await create_slides_and_wait("nb-001")
        assert result is None

    async def test_returns_none_when_timeout(self, mock_config):
        """완료 대기 타임아웃 시 None"""
        with patch('noterang.artifacts.create_slides', return_value="art-001"):
            with patch('noterang.artifacts.wait_for_completion', new=AsyncMock(return_value=False)):
                from noterang.artifacts import create_slides_and_wait
                result = await create_slides_and_wait("nb-001")
        assert result is None


# ---------------------------------------------------------------------------
# create_infographic_and_wait (async)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCreateInfographicAndWait:
    """create_infographic_and_wait() 비동기 함수 테스트"""

    async def test_returns_artifact_id_when_successful(self, mock_config):
        """성공 시 artifact_id 반환"""
        with patch('noterang.artifacts.create_infographic', return_value="infographic-art-1"):
            with patch('noterang.artifacts.wait_for_completion', new=AsyncMock(return_value=True)):
                from noterang.artifacts import create_infographic_and_wait
                result = await create_infographic_and_wait("nb-001")
        assert result == "infographic-art-1"

    async def test_returns_none_when_creation_fails(self, mock_config):
        """생성 실패 시 None"""
        with patch('noterang.artifacts.create_infographic', return_value=None):
            from noterang.artifacts import create_infographic_and_wait
            result = await create_infographic_and_wait("nb-001")
        assert result is None

    async def test_returns_none_when_wait_fails(self, mock_config):
        """대기 실패 시 None"""
        with patch('noterang.artifacts.create_infographic', return_value="art-2"):
            with patch('noterang.artifacts.wait_for_completion', new=AsyncMock(return_value=False)):
                from noterang.artifacts import create_infographic_and_wait
                result = await create_infographic_and_wait("nb-001")
        assert result is None


# ---------------------------------------------------------------------------
# ArtifactManager
# ---------------------------------------------------------------------------

class TestArtifactManager:
    """ArtifactManager 클래스 테스트"""

    def test_initial_state(self):
        """초기 상태 확인"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        assert manager.notebook_id is None
        assert manager.artifacts == {}

    def test_initial_state_with_notebook_id(self):
        """notebook_id로 초기화"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager("nb-initial-id")
        assert manager.notebook_id == "nb-initial-id"

    def test_set_notebook(self):
        """set_notebook()으로 노트북 ID 설정"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        manager.set_notebook("nb-set-id")
        assert manager.notebook_id == "nb-set-id"

    def test_create_slides_returns_artifact_id(self, mock_config):
        """create_slides() 성공 시 artifact_id 반환 및 저장"""
        with patch('noterang.artifacts.create_slides', return_value="slide-art-1"):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            result = manager.create_slides()
        assert result == "slide-art-1"
        assert "slide-art-1" in manager.artifacts
        assert manager.artifacts["slide-art-1"]["type"] == "slides"

    def test_create_slides_returns_none_when_no_notebook(self, mock_config):
        """노트북 없으면 create_slides() None 반환"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        result = manager.create_slides()
        assert result is None

    def test_create_slides_stores_metadata(self, mock_config):
        """슬라이드 생성 시 메타데이터 저장"""
        with patch('noterang.artifacts.create_slides', return_value="art-meta"):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            manager.create_slides(language="ko", focus="테스트 주제")

        metadata = manager.artifacts["art-meta"]
        assert metadata["type"] == "slides"
        assert metadata["language"] == "ko"
        assert metadata["focus"] == "테스트 주제"
        assert "created_at" in metadata

    def test_create_infographic_returns_none_when_no_notebook(self, mock_config):
        """노트북 없으면 create_infographic() None 반환"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        result = manager.create_infographic()
        assert result is None

    def test_create_infographic_stores_metadata(self, mock_config):
        """인포그래픽 생성 시 메타데이터 저장"""
        with patch('noterang.artifacts.create_infographic', return_value="infographic-meta"):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            manager.create_infographic(style="minimal", language="ko")

        metadata = manager.artifacts["infographic-meta"]
        assert metadata["type"] == "infographic"
        assert metadata["style"] == "minimal"

    def test_check_status_when_no_notebook(self, mock_config):
        """노트북 없으면 check_status() ('unknown', {error}) 반환"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        status, data = manager.check_status()
        assert status == "unknown"
        assert "error" in data

    def test_check_status_delegates_to_check_studio_status(self, mock_config):
        """check_status()는 check_studio_status()에 위임"""
        with patch('noterang.artifacts.check_studio_status', return_value=("completed", {"ok": True})):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            status, data = manager.check_status()
        assert status == "completed"

    def test_is_complete_returns_false_when_no_notebook(self, mock_config):
        """노트북 없으면 is_complete() False"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        assert manager.is_complete() is False

    def test_is_complete_delegates_to_is_generation_complete(self, mock_config):
        """is_complete()는 is_generation_complete()에 위임"""
        with patch('noterang.artifacts.is_generation_complete', return_value=True):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            result = manager.is_complete()
        assert result is True

    @pytest.mark.asyncio
    async def test_wait_complete_returns_false_when_no_notebook(self, mock_config):
        """노트북 없으면 wait_complete() False"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        result = await manager.wait_complete()
        assert result is False

    @pytest.mark.asyncio
    async def test_wait_complete_delegates_to_wait_for_completion(self, mock_config):
        """wait_complete()는 wait_for_completion()에 위임"""
        with patch('noterang.artifacts.wait_for_completion', new=AsyncMock(return_value=True)):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            result = await manager.wait_complete(timeout=600)
        assert result is True

    @pytest.mark.asyncio
    async def test_create_slides_wait_returns_none_when_no_notebook(self, mock_config):
        """노트북 없으면 create_slides_wait() None"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        result = await manager.create_slides_wait()
        assert result is None

    @pytest.mark.asyncio
    async def test_create_slides_wait_success(self, mock_config):
        """create_slides_wait() 성공"""
        with patch('noterang.artifacts.create_slides_and_wait', new=AsyncMock(return_value="art-wait-1")):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            result = await manager.create_slides_wait()
        assert result == "art-wait-1"

    @pytest.mark.asyncio
    async def test_create_infographic_wait_returns_none_when_no_notebook(self, mock_config):
        """노트북 없으면 create_infographic_wait() None"""
        from noterang.artifacts import ArtifactManager
        manager = ArtifactManager()
        result = await manager.create_infographic_wait()
        assert result is None

    @pytest.mark.asyncio
    async def test_create_infographic_wait_success(self, mock_config):
        """create_infographic_wait() 성공"""
        with patch(
            'noterang.artifacts.create_infographic_and_wait',
            new=AsyncMock(return_value="infographic-wait-1")
        ):
            from noterang.artifacts import ArtifactManager
            manager = ArtifactManager("nb-001")
            result = await manager.create_infographic_wait()
        assert result == "infographic-wait-1"
