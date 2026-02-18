#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
notebook.py 유닛 테스트

노트북 CRUD, 연구(Research), 소스 관리, NotebookManager 클래스 테스트.
nlm_client는 unittest.mock으로 완전히 대체.
"""
import sys
from pathlib import Path
from typing import Dict, List, Optional
from unittest.mock import patch, MagicMock, call

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_notebook(nb_id: str, title: str, source_count: int = 0):
    """테스트용 노트북 Mock 객체 생성"""
    nb = MagicMock()
    nb.id = nb_id
    nb.title = title
    nb.source_count = source_count
    return nb


# ---------------------------------------------------------------------------
# list_notebooks
# ---------------------------------------------------------------------------

class TestListNotebooks:
    """list_notebooks() 함수 테스트"""

    def test_returns_list_of_dicts(self):
        """노트북 목록을 딕셔너리 리스트로 반환"""
        mock_client = MagicMock()
        mock_client.list_notebooks.return_value = [
            _make_mock_notebook("id-001", "테스트 노트북", 3),
            _make_mock_notebook("id-002", "두 번째 노트북", 1),
        ]
        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import list_notebooks
            result = list_notebooks()

        assert len(result) == 2
        assert result[0] == {"id": "id-001", "title": "테스트 노트북", "source_count": 3}
        assert result[1] == {"id": "id-002", "title": "두 번째 노트북", "source_count": 1}

    def test_returns_empty_list_when_no_notebooks(self):
        """노트북 없을 때 빈 리스트 반환"""
        mock_client = MagicMock()
        mock_client.list_notebooks.return_value = []
        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import list_notebooks
            result = list_notebooks()
        assert result == []

    def test_returns_empty_list_on_exception(self):
        """예외 발생 시 빈 리스트 반환 (예외 전파 안 함)"""
        mock_client = MagicMock()
        mock_client.list_notebooks.side_effect = Exception("network error")
        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import list_notebooks
            result = list_notebooks()
        assert result == []

    def test_returns_empty_list_when_client_creation_fails(self):
        """클라이언트 생성 실패 시 빈 리스트 반환"""
        with patch('noterang.notebook.get_nlm_client', side_effect=RuntimeError("auth error")):
            from noterang.notebook import list_notebooks
            result = list_notebooks()
        assert result == []

    def test_result_contains_required_keys(self):
        """결과 딕셔너리에 필수 키 포함"""
        mock_client = MagicMock()
        mock_client.list_notebooks.return_value = [
            _make_mock_notebook("abc-123", "노트북", 5),
        ]
        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import list_notebooks
            result = list_notebooks()
        assert "id" in result[0]
        assert "title" in result[0]
        assert "source_count" in result[0]


# ---------------------------------------------------------------------------
# find_notebook
# ---------------------------------------------------------------------------

class TestFindNotebook:
    """find_notebook() 함수 테스트"""

    def test_finds_notebook_by_exact_title(self):
        """정확한 제목으로 노트북 찾기"""
        notebooks = [
            {"id": "id-001", "title": "회전근개 파열", "source_count": 2},
            {"id": "id-002", "title": "오십견", "source_count": 0},
        ]
        with patch('noterang.notebook.list_notebooks', return_value=notebooks):
            from noterang.notebook import find_notebook
            result = find_notebook("오십견")
        assert result == {"id": "id-002", "title": "오십견", "source_count": 0}

    def test_returns_none_when_not_found(self):
        """해당 제목의 노트북이 없으면 None 반환"""
        notebooks = [
            {"id": "id-001", "title": "회전근개 파열", "source_count": 2},
        ]
        with patch('noterang.notebook.list_notebooks', return_value=notebooks):
            from noterang.notebook import find_notebook
            result = find_notebook("존재하지 않는 노트북")
        assert result is None

    def test_returns_none_on_empty_list(self):
        """빈 목록에서 검색 시 None 반환"""
        with patch('noterang.notebook.list_notebooks', return_value=[]):
            from noterang.notebook import find_notebook
            result = find_notebook("아무거나")
        assert result is None

    def test_returns_first_match_when_duplicates(self):
        """중복 제목이 있을 때 첫 번째 항목 반환"""
        notebooks = [
            {"id": "id-001", "title": "중복 제목", "source_count": 1},
            {"id": "id-002", "title": "중복 제목", "source_count": 2},
        ]
        with patch('noterang.notebook.list_notebooks', return_value=notebooks):
            from noterang.notebook import find_notebook
            result = find_notebook("중복 제목")
        assert result["id"] == "id-001"

    def test_case_sensitive_search(self):
        """대소문자 구분 검색 (한글 제목에서는 관계없지만 검증)"""
        notebooks = [
            {"id": "id-001", "title": "Test Notebook", "source_count": 0},
        ]
        with patch('noterang.notebook.list_notebooks', return_value=notebooks):
            from noterang.notebook import find_notebook
            # 대소문자가 다른 검색 → None
            result = find_notebook("test notebook")
        assert result is None

    def test_empty_string_search(self):
        """빈 문자열 검색 시 None 반환"""
        notebooks = [
            {"id": "id-001", "title": "", "source_count": 0},
        ]
        with patch('noterang.notebook.list_notebooks', return_value=notebooks):
            from noterang.notebook import find_notebook
            result = find_notebook("")
        # 빈 문자열 제목 노트북을 찾음
        assert result is not None
        assert result["id"] == "id-001"


# ---------------------------------------------------------------------------
# create_notebook
# ---------------------------------------------------------------------------

class TestCreateNotebook:
    """create_notebook() 함수 테스트"""

    def test_returns_notebook_id_on_success(self):
        """성공 시 노트북 ID 반환"""
        mock_result = MagicMock()
        mock_result.id = "new-notebook-id-12345678"

        mock_client = MagicMock()
        mock_client.create_notebook.return_value = mock_result

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import create_notebook
            result = create_notebook("새 노트북")
        assert result == "new-notebook-id-12345678"

    def test_calls_client_with_correct_title(self):
        """클라이언트에 정확한 제목으로 호출"""
        mock_result = MagicMock()
        mock_result.id = "some-id"

        mock_client = MagicMock()
        mock_client.create_notebook.return_value = mock_result

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import create_notebook
            create_notebook("족저근막염")
        mock_client.create_notebook.assert_called_once_with("족저근막염")

    def test_returns_none_when_result_has_no_id(self):
        """결과에 id 없으면 None 반환"""
        mock_result = MagicMock()
        mock_result.id = None

        mock_client = MagicMock()
        mock_client.create_notebook.return_value = mock_result

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import create_notebook
            result = create_notebook("노트북")
        assert result is None

    def test_returns_none_when_result_is_none(self):
        """클라이언트가 None 반환 시 None"""
        mock_client = MagicMock()
        mock_client.create_notebook.return_value = None

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import create_notebook
            result = create_notebook("노트북")
        assert result is None

    def test_returns_none_on_exception(self):
        """예외 발생 시 None 반환"""
        mock_client = MagicMock()
        mock_client.create_notebook.side_effect = Exception("API error")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import create_notebook
            result = create_notebook("노트북")
        assert result is None


# ---------------------------------------------------------------------------
# delete_notebook
# ---------------------------------------------------------------------------

class TestDeleteNotebook:
    """delete_notebook() 함수 테스트"""

    def test_returns_true_on_success(self):
        """성공 시 True 반환"""
        mock_client = MagicMock()
        mock_client.delete_notebook.return_value = True

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import delete_notebook
            result = delete_notebook("nb-id-001")
        assert result is True

    def test_returns_false_when_client_returns_false(self):
        """클라이언트가 False 반환 시 False"""
        mock_client = MagicMock()
        mock_client.delete_notebook.return_value = False

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import delete_notebook
            result = delete_notebook("nb-id-001")
        assert result is False

    def test_returns_false_on_exception(self):
        """예외 발생 시 False 반환"""
        mock_client = MagicMock()
        mock_client.delete_notebook.side_effect = Exception("delete failed")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import delete_notebook
            result = delete_notebook("nb-id-001")
        assert result is False

    def test_calls_client_with_correct_id(self):
        """정확한 ID로 클라이언트 호출"""
        mock_client = MagicMock()
        mock_client.delete_notebook.return_value = True

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import delete_notebook
            delete_notebook("specific-notebook-id")
        mock_client.delete_notebook.assert_called_once_with("specific-notebook-id")


# ---------------------------------------------------------------------------
# get_or_create_notebook
# ---------------------------------------------------------------------------

class TestGetOrCreateNotebook:
    """get_or_create_notebook() 함수 테스트"""

    def test_returns_existing_notebook_id_when_found(self):
        """기존 노트북이 있으면 해당 ID 반환"""
        existing = {"id": "existing-id-001", "title": "회전근개", "source_count": 2}
        with patch('noterang.notebook.find_notebook', return_value=existing):
            from noterang.notebook import get_or_create_notebook
            result = get_or_create_notebook("회전근개")
        assert result == "existing-id-001"

    def test_creates_new_notebook_when_not_found(self):
        """기존 노트북 없으면 새로 생성"""
        with patch('noterang.notebook.find_notebook', return_value=None):
            with patch('noterang.notebook.create_notebook', return_value="new-id-999") as mock_create:
                from noterang.notebook import get_or_create_notebook
                result = get_or_create_notebook("새로운 주제")
        assert result == "new-id-999"
        mock_create.assert_called_once_with("새로운 주제")

    def test_returns_none_when_creation_fails(self):
        """노트북 생성 실패 시 None 반환"""
        with patch('noterang.notebook.find_notebook', return_value=None):
            with patch('noterang.notebook.create_notebook', return_value=None):
                from noterang.notebook import get_or_create_notebook
                result = get_or_create_notebook("실패 주제")
        assert result is None


# ---------------------------------------------------------------------------
# start_research
# ---------------------------------------------------------------------------

class TestStartResearch:
    """start_research() 함수 테스트"""

    def test_returns_task_id_on_success(self):
        """연구 성공 시 task_id 반환"""
        mock_client = MagicMock()
        mock_client.start_research.return_value = {"task_id": "task-abc-123"}

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import start_research
            result = start_research("nb-id", "족저근막염 치료", mode="fast")
        assert result == "task-abc-123"

    def test_returns_none_when_no_task_id(self):
        """task_id 없으면 None 반환"""
        mock_client = MagicMock()
        mock_client.start_research.return_value = {}  # task_id 없음

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import start_research
            result = start_research("nb-id", "쿼리")
        assert result is None

    def test_returns_none_on_exception(self):
        """예외 발생 시 None 반환"""
        mock_client = MagicMock()
        mock_client.start_research.side_effect = Exception("research error")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import start_research
            result = start_research("nb-id", "쿼리")
        assert result is None

    def test_calls_client_with_correct_mode(self):
        """mode 파라미터가 클라이언트에 전달됨"""
        mock_client = MagicMock()
        mock_client.start_research.return_value = {"task_id": "t1"}

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import start_research
            start_research("nb-id", "쿼리", mode="deep")
        mock_client.start_research.assert_called_once_with("nb-id", "쿼리", mode="deep")

    def test_default_mode_is_fast(self):
        """기본 mode는 'fast'"""
        mock_client = MagicMock()
        mock_client.start_research.return_value = {"task_id": "t1"}

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import start_research
            start_research("nb-id", "쿼리")
        # mode 기본값이 "fast"로 호출되어야 함
        _, kwargs = mock_client.start_research.call_args
        assert kwargs.get("mode") == "fast"


# ---------------------------------------------------------------------------
# check_research_status
# ---------------------------------------------------------------------------

class TestCheckResearchStatus:
    """check_research_status() 함수 테스트"""

    def test_returns_completed_true_when_status_completed(self):
        """status가 'completed'이면 (True, 'completed') 반환"""
        mock_client = MagicMock()
        mock_client.poll_research.return_value = {"status": "completed"}

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import check_research_status
            is_done, status = check_research_status("nb-id")
        assert is_done is True
        assert status == "completed"

    def test_returns_false_when_status_in_progress(self):
        """status가 'in_progress'이면 (False, 'in_progress') 반환"""
        mock_client = MagicMock()
        mock_client.poll_research.return_value = {"status": "in_progress"}

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import check_research_status
            is_done, status = check_research_status("nb-id")
        assert is_done is False
        assert status == "in_progress"

    def test_returns_no_research_when_result_none(self):
        """poll_research가 None이면 (False, 'no_research') 반환"""
        mock_client = MagicMock()
        mock_client.poll_research.return_value = None

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import check_research_status
            is_done, status = check_research_status("nb-id")
        assert is_done is False
        assert status == "no_research"

    def test_returns_error_string_on_exception(self):
        """예외 발생 시 (False, error_message) 반환"""
        mock_client = MagicMock()
        mock_client.poll_research.side_effect = Exception("poll failed")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import check_research_status
            is_done, status = check_research_status("nb-id")
        assert is_done is False
        assert "poll failed" in status


# ---------------------------------------------------------------------------
# add_source_url / add_source_text
# ---------------------------------------------------------------------------

class TestAddSources:
    """소스 추가 함수 테스트"""

    def test_add_url_returns_true_on_success(self):
        mock_client = MagicMock()
        mock_client.add_url_source.return_value = MagicMock()  # not None

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_url
            result = add_source_url("nb-id", "https://example.com/article")
        assert result is True

    def test_add_url_returns_false_when_result_none(self):
        mock_client = MagicMock()
        mock_client.add_url_source.return_value = None

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_url
            result = add_source_url("nb-id", "https://example.com")
        assert result is False

    def test_add_url_returns_false_on_exception(self):
        mock_client = MagicMock()
        mock_client.add_url_source.side_effect = Exception("url error")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_url
            result = add_source_url("nb-id", "https://example.com")
        assert result is False

    def test_add_text_returns_true_on_success(self):
        mock_client = MagicMock()
        mock_client.add_text_source.return_value = MagicMock()

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_text
            result = add_source_text("nb-id", "텍스트 내용")
        assert result is True

    def test_add_text_uses_default_title(self):
        """텍스트 소스 기본 제목 확인"""
        mock_client = MagicMock()
        mock_client.add_text_source.return_value = MagicMock()

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_text
            add_source_text("nb-id", "내용")
        _, kwargs = mock_client.add_text_source.call_args
        assert kwargs.get("title") == "텍스트 소스"

    def test_add_text_uses_custom_title(self):
        """커스텀 제목으로 소스 추가"""
        mock_client = MagicMock()
        mock_client.add_text_source.return_value = MagicMock()

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_text
            add_source_text("nb-id", "내용", title="커스텀 제목")
        _, kwargs = mock_client.add_text_source.call_args
        assert kwargs.get("title") == "커스텀 제목"

    def test_add_text_returns_false_on_exception(self):
        mock_client = MagicMock()
        mock_client.add_text_source.side_effect = Exception("text error")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import add_source_text
            result = add_source_text("nb-id", "내용")
        assert result is False


# ---------------------------------------------------------------------------
# get_notebook_sources
# ---------------------------------------------------------------------------

class TestGetNotebookSources:
    """get_notebook_sources() 함수 테스트"""

    def test_returns_sources_list(self):
        mock_sources = [{"id": "s1", "type": "url"}, {"id": "s2", "type": "text"}]
        mock_client = MagicMock()
        mock_client.get_notebook_sources_with_types.return_value = mock_sources

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import get_notebook_sources
            result = get_notebook_sources("nb-id")
        assert result == mock_sources

    def test_returns_empty_list_on_exception(self):
        mock_client = MagicMock()
        mock_client.get_notebook_sources_with_types.side_effect = Exception("sources error")

        with patch('noterang.notebook.get_nlm_client', return_value=mock_client):
            from noterang.notebook import get_notebook_sources
            result = get_notebook_sources("nb-id")
        assert result == []


# ---------------------------------------------------------------------------
# NotebookManager
# ---------------------------------------------------------------------------

class TestNotebookManager:
    """NotebookManager 클래스 테스트"""

    def test_initial_state(self):
        """초기 상태 확인"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        assert manager.current_notebook_id is None
        assert manager.current_title is None

    def test_set_current(self):
        """set_current()로 현재 노트북 설정"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        manager.set_current("id-123", "테스트")
        assert manager.current_notebook_id == "id-123"
        assert manager.current_title == "테스트"

    def test_set_current_without_title(self):
        """제목 없이 set_current() 호출"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        manager.set_current("id-456")
        assert manager.current_notebook_id == "id-456"
        assert manager.current_title is None

    def test_list_delegates_to_list_notebooks(self):
        """list()는 list_notebooks()에 위임"""
        from noterang.notebook import NotebookManager
        expected = [{"id": "id-1", "title": "nb1", "source_count": 0}]
        with patch('noterang.notebook.list_notebooks', return_value=expected):
            manager = NotebookManager()
            result = manager.list()
        assert result == expected

    def test_find_delegates_to_find_notebook(self):
        """find()는 find_notebook()에 위임"""
        from noterang.notebook import NotebookManager
        expected = {"id": "id-1", "title": "오십견", "source_count": 0}
        with patch('noterang.notebook.find_notebook', return_value=expected):
            manager = NotebookManager()
            result = manager.find("오십견")
        assert result == expected

    def test_create_sets_current_on_success(self):
        """create() 성공 시 current 설정"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.create_notebook', return_value="created-id"):
            manager = NotebookManager()
            nb_id = manager.create("새 노트북")
        assert nb_id == "created-id"
        assert manager.current_notebook_id == "created-id"
        assert manager.current_title == "새 노트북"

    def test_create_does_not_set_current_on_failure(self):
        """create() 실패 시 current 변경 없음"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.create_notebook', return_value=None):
            manager = NotebookManager()
            nb_id = manager.create("실패 노트북")
        assert nb_id is None
        assert manager.current_notebook_id is None

    def test_delete_uses_provided_id(self):
        """명시적 ID로 delete() 호출"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.delete_notebook', return_value=True):
            manager = NotebookManager()
            result = manager.delete("explicit-id")
        assert result is True

    def test_delete_uses_current_when_no_id_provided(self):
        """ID 미제공 시 current_notebook_id 사용"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.delete_notebook', return_value=True) as mock_del:
            manager = NotebookManager()
            manager.set_current("current-nb-id", "현재 노트북")
            manager.delete()
        mock_del.assert_called_once_with("current-nb-id")

    def test_delete_returns_false_when_no_id_at_all(self):
        """ID가 없고 current도 없으면 False 반환"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        result = manager.delete()
        assert result is False

    def test_delete_clears_current_when_deleting_current(self):
        """현재 노트북 삭제 시 current 클리어"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.delete_notebook', return_value=True):
            manager = NotebookManager()
            manager.set_current("nb-to-delete", "삭제 노트북")
            manager.delete()
        assert manager.current_notebook_id is None
        assert manager.current_title is None

    def test_get_or_create_sets_current_on_success(self):
        """get_or_create() 성공 시 current 설정"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.get_or_create_notebook', return_value="found-or-created-id"):
            manager = NotebookManager()
            result = manager.get_or_create("주제")
        assert result == "found-or-created-id"
        assert manager.current_notebook_id == "found-or-created-id"

    def test_research_uses_current_notebook(self):
        """research()는 current_notebook_id 사용"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.start_research', return_value="task-id") as mock_sr:
            manager = NotebookManager()
            manager.set_current("nb-id-research", "연구 노트북")
            result = manager.research("검색 쿼리")
        mock_sr.assert_called_once_with("nb-id-research", "검색 쿼리", "fast")
        assert result == "task-id"

    def test_research_returns_none_when_no_notebook(self):
        """노트북 없으면 research() None 반환"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        result = manager.research("쿼리")
        assert result is None

    def test_check_research_uses_current(self):
        """check_research()는 current_notebook_id 사용"""
        from noterang.notebook import NotebookManager
        with patch('noterang.notebook.check_research_status', return_value=(True, "completed")):
            manager = NotebookManager()
            manager.set_current("nb-id", "nb")
            is_done, status = manager.check_research()
        assert is_done is True
        assert status == "completed"

    def test_check_research_returns_false_when_no_notebook(self):
        """노트북 없으면 check_research() (False, '노트북 없음') 반환"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        is_done, status = manager.check_research()
        assert is_done is False
        assert "없음" in status

    def test_get_sources_returns_empty_when_no_notebook(self):
        """노트북 없으면 get_sources() 빈 리스트 반환"""
        from noterang.notebook import NotebookManager
        manager = NotebookManager()
        result = manager.get_sources()
        assert result == []


# ---------------------------------------------------------------------------
# get_notebook_manager (Singleton)
# ---------------------------------------------------------------------------

class TestGetNotebookManager:
    """get_notebook_manager() 싱글톤 함수 테스트"""

    def teardown_method(self):
        """테스트 후 싱글톤 리셋"""
        import noterang.notebook as nb_module
        nb_module._manager = None

    def test_returns_notebook_manager_instance(self):
        """NotebookManager 인스턴스 반환"""
        import noterang.notebook as nb_module
        nb_module._manager = None
        from noterang.notebook import get_notebook_manager, NotebookManager
        manager = get_notebook_manager()
        assert isinstance(manager, NotebookManager)

    def test_returns_same_instance_on_multiple_calls(self):
        """여러 번 호출해도 동일 인스턴스 반환"""
        import noterang.notebook as nb_module
        nb_module._manager = None
        from noterang.notebook import get_notebook_manager
        m1 = get_notebook_manager()
        m2 = get_notebook_manager()
        assert m1 is m2
