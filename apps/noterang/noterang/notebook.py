#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 노트북 관리 모듈
- 노트북 생성/삭제/목록
- 연구 자료 추가
- 소스 관리

Uses notebooklm_tools Python API directly (no subprocess).
"""
import sys
from typing import Optional, List, Dict, Tuple

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

from .nlm_client import get_nlm_client, NLMClientError


def list_notebooks() -> List[Dict]:
    """노트북 목록 조회"""
    try:
        client = get_nlm_client()
        notebooks = client.list_notebooks()
        return [
            {
                "id": nb.id,
                "title": nb.title,
                "source_count": nb.source_count,
            }
            for nb in notebooks
        ]
    except Exception as e:
        print(f"  ❌ 노트북 목록 조회 실패: {e}")
        return []


def find_notebook(title: str) -> Optional[Dict]:
    """이름으로 노트북 찾기"""
    notebooks = list_notebooks()
    for nb in notebooks:
        if nb.get('title') == title:
            return nb
    return None


def create_notebook(title: str) -> Optional[str]:
    """
    새 노트북 생성

    Args:
        title: 노트북 제목

    Returns:
        노트북 ID 또는 None
    """
    try:
        client = get_nlm_client()
        result = client.create_notebook(title)
        if result and result.id:
            print(f"  ✓ 노트북 생성: {result.id[:8]}...")
            return result.id
        return None
    except Exception as e:
        print(f"  ❌ 노트북 생성 실패: {e}")
        return None


def delete_notebook(notebook_id: str) -> bool:
    """
    노트북 삭제

    Args:
        notebook_id: 노트북 ID

    Returns:
        성공 여부
    """
    try:
        client = get_nlm_client()
        success = client.delete_notebook(notebook_id)
        if success:
            print(f"  ✓ 노트북 삭제됨: {notebook_id[:8]}...")
            return True
        else:
            print(f"  ❌ 삭제 실패")
            return False
    except Exception as e:
        print(f"  ❌ 삭제 실패: {e}")
        return False


def get_or_create_notebook(title: str) -> Optional[str]:
    """
    노트북 찾기 또는 생성

    Args:
        title: 노트북 제목

    Returns:
        노트북 ID 또는 None
    """
    # 먼저 기존 노트북 찾기
    existing = find_notebook(title)
    if existing:
        notebook_id = existing.get('id')
        print(f"  기존 노트북 발견: {notebook_id[:8]}...")
        return notebook_id

    # 없으면 새로 생성
    return create_notebook(title)


def start_research(notebook_id: str, query: str, mode: str = "fast") -> Optional[str]:
    """
    연구 시작

    Args:
        notebook_id: 노트북 ID
        query: 검색 쿼리
        mode: "fast" 또는 "deep"

    Returns:
        Task ID 또는 None
    """
    try:
        client = get_nlm_client()
        result = client.start_research(notebook_id, query, mode=mode)
        if result:
            return result.get('task_id')
        return None
    except Exception as e:
        print(f"  ❌ 연구 시작 실패: {e}")
        return None


def check_research_status(notebook_id: str) -> Tuple[bool, str]:
    """
    연구 상태 확인

    Returns:
        (완료 여부, 상태 문자열)
    """
    try:
        client = get_nlm_client()
        result = client.poll_research(notebook_id)
        if result is None:
            return False, "no_research"
        status = result.get('status', 'unknown')
        is_completed = status == 'completed'
        return is_completed, status
    except Exception as e:
        return False, str(e)


def import_research(notebook_id: str, task_id: str) -> int:
    """
    연구 결과 가져오기

    Returns:
        가져온 소스 수
    """
    try:
        client = get_nlm_client()
        # First poll to get sources
        result = client.poll_research(notebook_id, target_task_id=task_id)
        if not result or not result.get('sources'):
            return 0

        imported = client.import_research_sources(
            notebook_id, task_id, result['sources']
        )
        return len(imported)
    except Exception as e:
        print(f"  ❌ 연구 가져오기 실패: {e}")
        return 0


def get_notebook_sources(notebook_id: str) -> List[Dict]:
    """노트북 소스 목록"""
    try:
        client = get_nlm_client()
        return client.get_notebook_sources_with_types(notebook_id)
    except Exception:
        return []


def add_source_url(notebook_id: str, url: str) -> bool:
    """URL 소스 추가"""
    try:
        client = get_nlm_client()
        result = client.add_url_source(notebook_id, url)
        return result is not None
    except Exception:
        return False


def add_source_text(notebook_id: str, text: str, title: str = "텍스트 소스") -> bool:
    """텍스트 소스 추가"""
    try:
        client = get_nlm_client()
        result = client.add_text_source(notebook_id, text, title=title)
        return result is not None
    except Exception:
        return False


class NotebookManager:
    """노트북 관리자 클래스"""

    def __init__(self):
        self.current_notebook_id: Optional[str] = None
        self.current_title: Optional[str] = None

    def set_current(self, notebook_id: str, title: str = None):
        """현재 노트북 설정"""
        self.current_notebook_id = notebook_id
        self.current_title = title

    def list(self) -> List[Dict]:
        """노트북 목록"""
        return list_notebooks()

    def find(self, title: str) -> Optional[Dict]:
        """이름으로 노트북 찾기"""
        return find_notebook(title)

    def create(self, title: str) -> Optional[str]:
        """노트북 생성"""
        notebook_id = create_notebook(title)
        if notebook_id:
            self.set_current(notebook_id, title)
        return notebook_id

    def delete(self, notebook_id: str = None) -> bool:
        """노트북 삭제"""
        target_id = notebook_id or self.current_notebook_id
        if not target_id:
            print("  ❌ 삭제할 노트북 없음")
            return False

        if delete_notebook(target_id):
            if target_id == self.current_notebook_id:
                self.current_notebook_id = None
                self.current_title = None
            return True
        return False

    def get_or_create(self, title: str) -> Optional[str]:
        """노트북 찾기 또는 생성"""
        notebook_id = get_or_create_notebook(title)
        if notebook_id:
            self.set_current(notebook_id, title)
        return notebook_id

    def research(self, query: str, mode: str = "fast", notebook_id: str = None) -> Optional[str]:
        """연구 시작"""
        target_id = notebook_id or self.current_notebook_id
        if not target_id:
            print("  ❌ 노트북 없음")
            return None
        return start_research(target_id, query, mode)

    def check_research(self, notebook_id: str = None) -> Tuple[bool, str]:
        """연구 상태 확인"""
        target_id = notebook_id or self.current_notebook_id
        if not target_id:
            return False, "노트북 없음"
        return check_research_status(target_id)

    def import_research_results(self, task_id: str, notebook_id: str = None) -> int:
        """연구 결과 가져오기"""
        target_id = notebook_id or self.current_notebook_id
        if not target_id:
            return 0
        return import_research(target_id, task_id)

    def get_sources(self, notebook_id: str = None) -> List[Dict]:
        """소스 목록"""
        target_id = notebook_id or self.current_notebook_id
        if not target_id:
            return []
        return get_notebook_sources(target_id)


# 전역 매니저
_manager: Optional[NotebookManager] = None


def get_notebook_manager() -> NotebookManager:
    """전역 노트북 매니저 반환"""
    global _manager
    if _manager is None:
        _manager = NotebookManager()
    return _manager
