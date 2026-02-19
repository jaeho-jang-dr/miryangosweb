#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
nlm_to_web.py 및 관련 run_pipeline.py 유닛 테스트

테스트 대상:
  - find_latest_pdf()
  - match_body_part()
  - PDFAnalyzer.clean_slide_text()
  - PDFAnalyzer.build_summary()
  - PDFAnalyzer.build_content()
  - PDFAnalyzer._extract_keywords()
  - NoterangPipeline (초기화, 연구쿼리, 태그, run())
  - nlm_to_web.main() argparse 시나리오

Firebase, fitz(PyMuPDF), NoterangPipeline.run_noterang() 등은 모두 mock 처리.
"""
import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock, mock_open

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))


# ---------------------------------------------------------------------------
# find_latest_pdf (nlm_to_web.py)
# ---------------------------------------------------------------------------

class TestFindLatestPdf:
    """find_latest_pdf() 테스트"""

    def test_returns_none_when_directory_does_not_exist(self, tmp_path):
        """존재하지 않는 디렉토리에서 None 반환"""
        nonexistent = tmp_path / "does_not_exist"
        # nlm_to_web의 DOWNLOAD_DIR을 mock하여 import
        with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
            sys.path.insert(0, str(Path(__file__).parent.parent))
            # 직접 함수 로직 테스트
            from nlm_to_web import find_latest_pdf
            result = find_latest_pdf(nonexistent)
        assert result is None

    def test_returns_none_when_no_pdfs(self, tmp_path):
        """PDF 없는 디렉토리에서 None 반환"""
        # 비PDF 파일 생성
        (tmp_path / "notpdf.txt").write_text("hello")
        with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
            from nlm_to_web import find_latest_pdf
            result = find_latest_pdf(tmp_path)
        assert result is None

    def test_returns_single_pdf(self, tmp_path):
        """단일 PDF 파일 반환"""
        pdf_file = tmp_path / "test.pdf"
        pdf_file.write_bytes(b"%PDF-1.4")
        with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
            from nlm_to_web import find_latest_pdf
            result = find_latest_pdf(tmp_path)
        assert result == pdf_file

    def test_returns_most_recent_pdf(self, tmp_path):
        """여러 PDF 중 가장 최신 파일 반환"""
        import time

        pdf1 = tmp_path / "old.pdf"
        pdf1.write_bytes(b"%PDF-1.4 old")
        time.sleep(0.05)  # 수정 시간 차이 확보
        pdf2 = tmp_path / "new.pdf"
        pdf2.write_bytes(b"%PDF-1.4 new")

        with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
            from nlm_to_web import find_latest_pdf
            result = find_latest_pdf(tmp_path)
        assert result.name == "new.pdf"

    def test_ignores_non_pdf_files(self, tmp_path):
        """PDF가 아닌 파일은 무시"""
        (tmp_path / "slide.pptx").write_bytes(b"PPTX")
        (tmp_path / "image.png").write_bytes(b"PNG")
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
            from nlm_to_web import find_latest_pdf
            result = find_latest_pdf(tmp_path)
        assert result.name == "slides.pdf"


# ---------------------------------------------------------------------------
# match_body_part (run_pipeline.py)
# ---------------------------------------------------------------------------

class TestMatchBodyPart:
    """match_body_part() 함수 테스트"""

    def _get_match_body_part(self):
        # run_pipeline을 직접 임포트 (fitz 의존성 때문에 mock 필요)
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            import importlib
            if 'run_pipeline' in sys.modules:
                rp = sys.modules['run_pipeline']
            else:
                import run_pipeline as rp
            return rp.match_body_part

    def test_shoulder_keyword_matches(self):
        """어깨 키워드로 shoulder 반환"""
        fn = self._get_match_body_part()
        result = fn(["회전근개", "파열"], "회전근개 파열")
        assert result == "shoulder"

    def test_knee_keyword_matches(self):
        """무릎 키워드로 knee 반환"""
        fn = self._get_match_body_part()
        result = fn(["반월상연골", "손상"], "반월상연골 손상")
        assert result == "knee"

    def test_foot_ankle_keyword_matches(self):
        """족저근막 키워드로 foot_ankle 반환"""
        fn = self._get_match_body_part()
        result = fn(["족저근막", "염증"], "족저근막염")
        assert result == "foot_ankle"

    def test_spine_keyword_matches(self):
        """허리 키워드로 spine 반환"""
        fn = self._get_match_body_part()
        result = fn(["디스크", "요추"], "요추 디스크")
        assert result == "spine"

    def test_returns_etc_for_unknown(self):
        """매칭 안 되면 'etc' 반환"""
        fn = self._get_match_body_part()
        result = fn([], "완전히 관련 없는 내용")
        assert result == "etc"

    def test_best_match_wins(self):
        """가장 많이 매칭된 부위 반환"""
        fn = self._get_match_body_part()
        # shoulder 키워드 2개 vs knee 키워드 1개
        result = fn(["어깨", "회전근개", "무릎"], "어깨 질환")
        assert result == "shoulder"

    def test_empty_tags_and_title(self):
        """빈 태그와 제목으로도 오류 없음"""
        fn = self._get_match_body_part()
        result = fn([], "")
        assert result == "etc"


# ---------------------------------------------------------------------------
# PDFAnalyzer.clean_slide_text (static method)
# ---------------------------------------------------------------------------

class TestCleanSlideText:
    """PDFAnalyzer.clean_slide_text() 정적 메서드 테스트"""

    def _get_clean_fn(self):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            if 'run_pipeline' in sys.modules:
                rp = sys.modules['run_pipeline']
            else:
                import run_pipeline as rp
            return rp.PDFAnalyzer.clean_slide_text

    def test_removes_notebooklm_mention(self):
        """NotebookLM 언급 제거"""
        fn = self._get_clean_fn()
        text = "이 슬라이드는 NotebookLM으로 생성되었습니다."
        result = fn(text)
        assert "NotebookLM" not in result
        assert "Notebook LM" not in result

    def test_removes_notebooklm_case_insensitive(self):
        """대소문자 무관하게 NotebookLM 제거"""
        fn = self._get_clean_fn()
        text = "A notebooklm study guide."
        result = fn(text)
        assert "notebooklm" not in result.lower()

    def test_removes_korean_notebook_lm(self):
        """한글 노트북LM 언급 제거"""
        fn = self._get_clean_fn()
        text = "노트북 LM으로 생성한 자료입니다."
        result = fn(text)
        assert "노트북" not in result or "LM" not in result

    def test_removes_ocr_artifact_dots_and_e(self):
        """·E 반복 패턴 제거"""
        fn = self._get_clean_fn()
        text = "정상 텍스트 ·E·E·E·E·E 이후 텍스트"
        result = fn(text)
        assert "·E·E·E" not in result

    def test_removes_repeated_dots(self):
        """· 3개 이상 반복 제거"""
        fn = self._get_clean_fn()
        text = "내용 · · · · · 끝"
        result = fn(text)
        # 3개 이상 반복된 ·는 제거됨
        assert result.count("·") < 3

    def test_removes_long_zero_sequences(self):
        """000000 이상 연속된 0 제거"""
        fn = self._get_clean_fn()
        text = "데이터: 0000000 오류"
        result = fn(text)
        assert "0000000" not in result

    def test_normalizes_multiple_spaces(self):
        """연속 공백 정규화"""
        fn = self._get_clean_fn()
        text = "단어1    단어2     단어3"
        result = fn(text)
        assert "  " not in result

    def test_normalizes_multiple_newlines(self):
        """연속 빈 줄 정규화"""
        fn = self._get_clean_fn()
        text = "라인1\n\n\n\n라인2"
        result = fn(text)
        assert "\n\n\n" not in result

    def test_returns_stripped_text(self):
        """결과 문자열의 앞뒤 공백 제거"""
        fn = self._get_clean_fn()
        text = "   내용   "
        result = fn(text)
        assert result == result.strip()

    def test_empty_string_returns_empty(self):
        """빈 문자열 입력 시 빈 문자열 반환"""
        fn = self._get_clean_fn()
        result = fn("")
        assert result == ""

    def test_clean_text_unchanged(self):
        """깨끗한 텍스트는 변경 없음 (공백 제외)"""
        fn = self._get_clean_fn()
        text = "회전근개는 어깨를 이루는 4개의 근육입니다."
        result = fn(text)
        assert "회전근개" in result
        assert "어깨" in result


# ---------------------------------------------------------------------------
# PDFAnalyzer._extract_keywords
# ---------------------------------------------------------------------------

class TestExtractKeywords:
    """PDFAnalyzer._extract_keywords() 메서드 테스트"""

    def _get_analyzer_class(self):
        mock_fitz = MagicMock()
        mock_doc = MagicMock()
        mock_doc.__len__ = MagicMock(return_value=5)
        mock_fitz.open.return_value = mock_doc

        with patch.dict('sys.modules', {
            'fitz': mock_fitz,
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            if 'run_pipeline' in sys.modules:
                rp = sys.modules['run_pipeline']
            else:
                import run_pipeline as rp
            return rp.PDFAnalyzer

    def test_extracts_korean_words(self):
        """한글 단어 추출"""
        cls = self._get_analyzer_class()
        # 인스턴스 생성 없이 내부 메서드 직접 테스트
        with patch('fitz.open', return_value=MagicMock(__len__=lambda x: 0)):
            with patch.dict('sys.modules', {'fitz': MagicMock()}):
                instance = MagicMock()
                # _extract_keywords를 언바운드 메서드로 호출
                text = "회전근개 회전근개 회전근개 파열 파열 어깨 어깨 진단 치료"
                result = cls._extract_keywords(instance, text, top_n=5)
        # 한글 단어가 추출되어야 함
        assert len(result) <= 5
        assert all(isinstance(w, str) for w in result)

    def test_filters_stopwords(self):
        """불용어 제거"""
        cls = self._get_analyzer_class()
        with patch.dict('sys.modules', {'fitz': MagicMock()}):
            instance = MagicMock()
            text = "그리고 하지만 또한 그래서 어깨 회전근개"
            result = cls._extract_keywords(instance, text, top_n=10)
        # 불용어는 포함되지 않아야 함
        assert "그리고" not in result
        assert "하지만" not in result

    def test_returns_top_n_keywords(self):
        """top_n 개 이하 반환"""
        cls = self._get_analyzer_class()
        with patch.dict('sys.modules', {'fitz': MagicMock()}):
            instance = MagicMock()
            text = " ".join(["단어" + str(i) for i in range(20)] * 3)
            result = cls._extract_keywords(instance, text, top_n=5)
        assert len(result) <= 5

    def test_empty_text_returns_empty_list(self):
        """빈 텍스트에서 빈 리스트 반환"""
        cls = self._get_analyzer_class()
        with patch.dict('sys.modules', {'fitz': MagicMock()}):
            instance = MagicMock()
            result = cls._extract_keywords(instance, "", top_n=10)
        assert result == []

    def test_filters_short_words(self):
        """1글자 단어는 제외"""
        cls = self._get_analyzer_class()
        with patch.dict('sys.modules', {'fitz': MagicMock()}):
            instance = MagicMock()
            # 1글자 한글만 있는 텍스트
            text = "이 그 저 것 뭐 이 그 저"
            result = cls._extract_keywords(instance, text, top_n=10)
        # 1글자 단어는 필터됨
        assert all(len(w) >= 2 for w in result)


# ---------------------------------------------------------------------------
# NoterangPipeline 초기화 및 기본 메서드
# ---------------------------------------------------------------------------

class TestNoterangPipelineInit:
    """NoterangPipeline 초기화 및 기본 메서드 테스트"""

    def _get_pipeline_class(self, mock_config):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            with patch('noterang.config.get_config', return_value=mock_config):
                if 'run_pipeline' in sys.modules:
                    rp = sys.modules['run_pipeline']
                else:
                    import run_pipeline as rp
                return rp.NoterangPipeline

    def test_default_initialization(self, mock_config):
        """기본값으로 초기화"""
        cls = self._get_pipeline_class(mock_config)
        with patch('noterang.config.get_config', return_value=mock_config):
            pipeline = cls(title="족저근막염")
        assert pipeline.title == "족저근막염"
        assert pipeline.register is True
        assert pipeline.visible is True
        assert pipeline.article_type == "disease"
        assert pipeline.design == "인포그래픽"
        assert pipeline.pdf_path is None

    def test_pdf_path_conversion(self, tmp_path, mock_config):
        """문자열 pdf_path를 Path 객체로 변환"""
        cls = self._get_pipeline_class(mock_config)
        pdf = tmp_path / "test.pdf"
        pdf.write_bytes(b"%PDF")
        with patch('noterang.config.get_config', return_value=mock_config):
            pipeline = cls(title="테스트", pdf_path=str(pdf))
        assert isinstance(pipeline.pdf_path, Path)

    def test_custom_article_type(self, mock_config):
        """커스텀 article_type 설정"""
        cls = self._get_pipeline_class(mock_config)
        with patch('noterang.config.get_config', return_value=mock_config):
            pipeline = cls(title="가이드", article_type="guide")
        assert pipeline.article_type == "guide"

    def test_hidden_sets_visible_false(self, mock_config):
        """visible=False 설정"""
        cls = self._get_pipeline_class(mock_config)
        with patch('noterang.config.get_config', return_value=mock_config):
            pipeline = cls(title="비공개", visible=False)
        assert pipeline.visible is False


class TestNoterangPipelineResearchQueries:
    """get_research_queries() 메서드 테스트"""

    def _make_pipeline(self, mock_config, **kwargs):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            with patch('noterang.config.get_config', return_value=mock_config):
                if 'run_pipeline' in sys.modules:
                    rp = sys.modules['run_pipeline']
                else:
                    import run_pipeline as rp
                return rp.NoterangPipeline(title="테스트", **kwargs)

    def test_auto_generates_queries_when_none(self, mock_config):
        """queries=None이면 3개 쿼리 자동 생성"""
        pipeline = self._make_pipeline(mock_config)
        queries = pipeline.get_research_queries()
        assert len(queries) == 3

    def test_auto_queries_contain_title(self, mock_config):
        """자동 생성 쿼리에 제목 포함"""
        pipeline = self._make_pipeline(mock_config)
        pipeline.title = "족저근막염"
        queries = pipeline.get_research_queries()
        for q in queries:
            assert "족저근막염" in q

    def test_auto_queries_exclude_traditional_medicine(self, mock_config):
        """자동 생성 쿼리에 한의학 제외 키워드 포함"""
        pipeline = self._make_pipeline(mock_config)
        queries = pipeline.get_research_queries()
        for q in queries:
            assert "-한의학" in q or "-한방" in q

    def test_uses_custom_queries_with_exclusions(self, mock_config):
        """커스텀 쿼리에 한의학 제외 키워드 추가"""
        pipeline = self._make_pipeline(mock_config, queries=["회전근개 치료", "어깨 수술"])
        queries = pipeline.get_research_queries()
        assert len(queries) == 2
        for q in queries:
            assert "-한의학" in q


class TestNoterangPipelineGenerateTags:
    """generate_tags() 메서드 테스트"""

    def _make_pipeline(self, mock_config, **kwargs):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            with patch('noterang.config.get_config', return_value=mock_config):
                if 'run_pipeline' in sys.modules:
                    rp = sys.modules['run_pipeline']
                else:
                    import run_pipeline as rp
                return rp.NoterangPipeline(title="족저근막염", **kwargs)

    def test_contains_base_tags(self, mock_config):
        """기본 태그(자동생성, 노트랑) 포함"""
        pipeline = self._make_pipeline(mock_config)
        tags = pipeline.generate_tags([])
        assert "자동생성" in tags
        assert "노트랑" in tags

    def test_contains_title_words(self, mock_config):
        """제목 단어가 태그에 포함"""
        pipeline = self._make_pipeline(mock_config)
        pipeline.title = "족저근막 염증"
        tags = pipeline.generate_tags([])
        assert "족저근막" in tags

    def test_includes_pdf_keywords(self, mock_config):
        """PDF 키워드가 태그에 포함"""
        pipeline = self._make_pipeline(mock_config)
        tags = pipeline.generate_tags(["아킬레스", "발뒤꿈치", "통증"])
        assert "아킬레스" in tags

    def test_includes_body_part_tag(self, mock_config):
        """부위 태그 포함 (족저근막 → foot_ankle)"""
        pipeline = self._make_pipeline(mock_config)
        # 족저근막염 → foot_ankle 매핑
        tags = pipeline.generate_tags(["족저근막", "아킬레스"])
        # 발/발목 레이블이 포함되어야 함
        tag_str = " ".join(tags)
        assert "발" in tag_str or "발목" in tag_str

    def test_no_duplicate_tags(self, mock_config):
        """중복 태그 없음"""
        pipeline = self._make_pipeline(mock_config)
        tags = pipeline.generate_tags(["족저근막", "염증", "족저근막"])
        # 중복 제거 검증
        assert len(tags) == len(set(tags))

    def test_empty_keywords(self, mock_config):
        """빈 키워드 리스트도 정상 동작"""
        pipeline = self._make_pipeline(mock_config)
        tags = pipeline.generate_tags(None)
        assert isinstance(tags, list)
        assert len(tags) > 0


# ---------------------------------------------------------------------------
# NoterangPipeline.run() 통합 시나리오
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestNoterangPipelineRun:
    """NoterangPipeline.run() 비동기 통합 테스트"""

    def _make_pipeline(self, mock_config, **kwargs):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            with patch('noterang.config.get_config', return_value=mock_config):
                if 'run_pipeline' in sys.modules:
                    rp = sys.modules['run_pipeline']
                else:
                    import run_pipeline as rp
                return rp.NoterangPipeline(title="테스트 슬라이드", **kwargs)

    async def test_fails_when_pdf_path_does_not_exist(self, tmp_path, mock_config):
        """존재하지 않는 PDF 경로 시 실패"""
        nonexistent_pdf = tmp_path / "nonexistent.pdf"
        pipeline = self._make_pipeline(mock_config, pdf_path=str(nonexistent_pdf))

        result = await pipeline.run()
        assert result["success"] is False
        assert "PDF 파일 없음" in result.get("error", "")

    async def test_success_with_existing_pdf(self, tmp_path, mock_config):
        """기존 PDF로 성공 시나리오"""
        # PDF 파일 생성
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4 test content")

        mock_analysis = {
            "page_count": 10,
            "titles": ["슬라이드 1", "슬라이드 2"],
            "summary": "요약 내용",
            "content": "전체 내용",
            "keywords": ["어깨", "회전근개"],
            "total_chars": 100,
            "thumbnail": b"\x89PNG...",
        }

        pipeline = self._make_pipeline(
            mock_config,
            pdf_path=str(pdf),
            register=False,  # Firestore 등록 건너뜀
        )

        with patch.object(pipeline, 'analyze_pdf', return_value=mock_analysis):
            with patch.object(
                pipeline, 'upload_to_firebase',
                new=AsyncMock(return_value=("https://storage.example.com/file.pdf", "https://storage.example.com/thumb.png"))
            ):
                result = await pipeline.run()

        assert result["success"] is True
        assert result["title"] == "테스트 슬라이드"
        assert result["page_count"] == 10
        assert result["pdf_url"] == "https://storage.example.com/file.pdf"

    async def test_skips_registration_when_register_false(self, tmp_path, mock_config):
        """register=False 시 Firestore 등록 건너뜀"""
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_analysis = {
            "page_count": 5,
            "titles": [],
            "summary": "",
            "content": "",
            "keywords": [],
            "total_chars": 0,
            "thumbnail": None,
        }

        pipeline = self._make_pipeline(mock_config, pdf_path=str(pdf), register=False)

        with patch.object(pipeline, 'analyze_pdf', return_value=mock_analysis):
            with patch.object(
                pipeline, 'upload_to_firebase',
                new=AsyncMock(return_value=("/uploads/file.pdf", None))
            ):
                with patch.object(pipeline, 'register_to_firestore') as mock_register:
                    result = await pipeline.run()

        # register=False이므로 Firestore 등록 메서드가 호출되지 않아야 함
        mock_register.assert_not_called()
        assert result["doc_id"] is None

    async def test_registers_to_firestore_when_register_true(self, tmp_path, mock_config):
        """register=True 시 Firestore 등록 호출"""
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_analysis = {
            "page_count": 8,
            "titles": ["제목 1"],
            "summary": "요약",
            "content": "내용",
            "keywords": ["무릎", "연골"],
            "total_chars": 50,
            "thumbnail": b"PNG data",
        }

        pipeline = self._make_pipeline(mock_config, pdf_path=str(pdf), register=True)

        with patch.object(pipeline, 'analyze_pdf', return_value=mock_analysis):
            with patch.object(
                pipeline, 'upload_to_firebase',
                new=AsyncMock(return_value=("https://firebase.com/pdf.pdf", "https://firebase.com/thumb.png"))
            ):
                with patch.object(
                    pipeline, 'register_to_firestore', return_value="doc-id-12345"
                ):
                    result = await pipeline.run()

        assert result["success"] is True
        assert result["doc_id"] == "doc-id-12345"

    async def test_run_without_noterang_step_when_pdf_provided(self, tmp_path, mock_config):
        """pdf_path 제공 시 run_noterang() 호출 안 함"""
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_analysis = {
            "page_count": 5,
            "titles": [],
            "summary": "",
            "content": "",
            "keywords": [],
            "total_chars": 0,
            "thumbnail": None,
        }

        pipeline = self._make_pipeline(mock_config, pdf_path=str(pdf), register=False)

        with patch.object(pipeline, 'analyze_pdf', return_value=mock_analysis):
            with patch.object(
                pipeline, 'upload_to_firebase',
                new=AsyncMock(return_value=("/uploads/file.pdf", None))
            ):
                with patch.object(pipeline, 'run_noterang') as mock_noterang:
                    await pipeline.run()

        # pdf_path가 제공되면 run_noterang()을 호출하지 않아야 함
        mock_noterang.assert_not_called()


# ---------------------------------------------------------------------------
# nlm_to_web.main() argparse 시나리오
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestNlmToWebMain:
    """nlm_to_web.main() argparse 처리 테스트"""

    async def test_main_requires_pdf_or_latest(self):
        """--pdf 또는 --latest 없으면 오류"""
        with patch('sys.argv', ['nlm_to_web.py', '--title', '테스트']):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                result = await main()
        assert result == 1

    async def test_main_with_latest_returns_1_when_no_pdf(self, tmp_path):
        """--latest 지정 시 PDF 없으면 오류"""
        with patch('sys.argv', ['nlm_to_web.py', '--title', '테스트', '--latest']):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main, DOWNLOAD_DIR
                with patch('nlm_to_web.find_latest_pdf', return_value=None):
                    result = await main()
        assert result == 1

    async def test_main_with_pdf_path_success(self, tmp_path):
        """--pdf 지정 시 성공 시나리오"""
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_pipeline = MagicMock()
        mock_pipeline.run = AsyncMock(return_value={"success": True, "doc_id": "doc-123"})

        with patch('sys.argv', [
            'nlm_to_web.py',
            '--title', '족저근막염',
            '--pdf', str(pdf),
        ]):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                with patch('nlm_to_web.NoterangPipeline', return_value=mock_pipeline):
                    result = await main()
        assert result == 0

    async def test_main_with_pdf_path_failure(self, tmp_path):
        """--pdf 지정 시 파이프라인 실패 시나리오"""
        pdf = tmp_path / "slides.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_pipeline = MagicMock()
        mock_pipeline.run = AsyncMock(return_value={"success": False, "error": "분석 실패"})

        with patch('sys.argv', [
            'nlm_to_web.py',
            '--title', '족저근막염',
            '--pdf', str(pdf),
        ]):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                with patch('nlm_to_web.NoterangPipeline', return_value=mock_pipeline):
                    result = await main()
        assert result == 1

    async def test_main_with_latest_selects_newest_pdf(self, tmp_path):
        """--latest 시 최신 PDF 자동 선택"""
        import time
        pdf = tmp_path / "latest.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_pipeline = MagicMock()
        mock_pipeline.run = AsyncMock(return_value={"success": True})

        with patch('sys.argv', [
            'nlm_to_web.py',
            '--title', '테스트',
            '--latest',
        ]):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                with patch('nlm_to_web.find_latest_pdf', return_value=pdf):
                    with patch('nlm_to_web.NoterangPipeline', return_value=mock_pipeline) as mock_cls:
                        result = await main()

        assert result == 0
        # NoterangPipeline에 올바른 pdf_path 전달 여부 확인
        call_kwargs = mock_cls.call_args[1]
        assert str(pdf) in call_kwargs.get("pdf_path", "")

    async def test_main_passes_type_argument(self, tmp_path):
        """--type 인수가 파이프라인에 전달됨"""
        pdf = tmp_path / "guide.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_pipeline = MagicMock()
        mock_pipeline.run = AsyncMock(return_value={"success": True})

        with patch('sys.argv', [
            'nlm_to_web.py',
            '--title', '테스트',
            '--pdf', str(pdf),
            '--type', 'guide',
        ]):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                with patch('nlm_to_web.NoterangPipeline', return_value=mock_pipeline) as mock_cls:
                    await main()

        call_kwargs = mock_cls.call_args[1]
        assert call_kwargs.get("article_type") == "guide"

    async def test_main_hidden_sets_visible_false(self, tmp_path):
        """--hidden 플래그 시 visible=False 전달"""
        pdf = tmp_path / "hidden.pdf"
        pdf.write_bytes(b"%PDF-1.4")

        mock_pipeline = MagicMock()
        mock_pipeline.run = AsyncMock(return_value={"success": True})

        with patch('sys.argv', [
            'nlm_to_web.py',
            '--title', '비공개 슬라이드',
            '--pdf', str(pdf),
            '--hidden',
        ]):
            with patch.dict('sys.modules', {'run_pipeline': MagicMock()}):
                from nlm_to_web import main
                with patch('nlm_to_web.NoterangPipeline', return_value=mock_pipeline) as mock_cls:
                    await main()

        call_kwargs = mock_cls.call_args[1]
        assert call_kwargs.get("visible") is False


# ---------------------------------------------------------------------------
# NoterangPipeline.copy_to_webapp (fallback upload)
# ---------------------------------------------------------------------------

class TestCopyToWebapp:
    """copy_to_webapp() fallback 메서드 테스트"""

    def _make_pipeline(self, mock_config, **kwargs):
        with patch.dict('sys.modules', {
            'fitz': MagicMock(),
            'firebase_admin': MagicMock(),
            'firebase_admin.credentials': MagicMock(),
            'firebase_admin.storage': MagicMock(),
            'firebase_admin.firestore': MagicMock(),
        }):
            with patch('noterang.config.get_config', return_value=mock_config):
                if 'run_pipeline' in sys.modules:
                    rp = sys.modules['run_pipeline']
                else:
                    import run_pipeline as rp
                return rp.NoterangPipeline(title="테스트", **kwargs)

    def test_returns_pdf_url_and_none_thumb(self, tmp_path, mock_config):
        """썸네일 없이 PDF URL만 반환"""
        pdf = tmp_path / "source.pdf"
        pdf.write_bytes(b"%PDF content")

        pipeline = self._make_pipeline(mock_config)

        import run_pipeline as rp
        with patch.object(rp, 'UPLOADS_DIR', tmp_path / "uploads"):
            with patch('shutil.copy2'):
                pdf_url, thumb_url = pipeline.copy_to_webapp(pdf, thumbnail=None)

        assert pdf_url.startswith("/uploads/")
        assert thumb_url is None

    def test_returns_both_urls_with_thumbnail(self, tmp_path, mock_config):
        """썸네일 포함 시 두 URL 모두 반환"""
        pdf = tmp_path / "source.pdf"
        pdf.write_bytes(b"%PDF content")

        pipeline = self._make_pipeline(mock_config)

        import run_pipeline as rp
        uploads_dir = tmp_path / "uploads"
        uploads_dir.mkdir(parents=True)

        with patch.object(rp, 'UPLOADS_DIR', uploads_dir):
            with patch('shutil.copy2'):
                pdf_url, thumb_url = pipeline.copy_to_webapp(pdf, thumbnail=b"\x89PNG data")

        assert pdf_url.startswith("/uploads/")
        assert thumb_url is not None
        assert thumb_url.startswith("/uploads/")

    def test_creates_uploads_dir_if_not_exists(self, tmp_path, mock_config):
        """uploads 디렉토리 없으면 생성"""
        pdf = tmp_path / "source.pdf"
        pdf.write_bytes(b"%PDF content")
        uploads_dir = tmp_path / "new_uploads"
        assert not uploads_dir.exists()

        pipeline = self._make_pipeline(mock_config)

        import run_pipeline as rp
        with patch.object(rp, 'UPLOADS_DIR', uploads_dir):
            with patch('shutil.copy2'):
                pipeline.copy_to_webapp(pdf, thumbnail=None)

        assert uploads_dir.exists()

    def test_title_sanitized_in_filename(self, tmp_path, mock_config):
        """파일명에서 공백/슬래시 안전 처리"""
        pdf = tmp_path / "source.pdf"
        pdf.write_bytes(b"%PDF content")

        pipeline = self._make_pipeline(mock_config)
        pipeline.title = "어깨 회전근개/파열"

        import run_pipeline as rp
        uploads_dir = tmp_path / "uploads"
        uploads_dir.mkdir()

        with patch.object(rp, 'UPLOADS_DIR', uploads_dir):
            with patch('shutil.copy2'):
                pdf_url, _ = pipeline.copy_to_webapp(pdf, thumbnail=None)

        # 공백 → _ , 슬래시 → -
        assert " " not in pdf_url
        assert "/" not in pdf_url.replace("/uploads/", "")
