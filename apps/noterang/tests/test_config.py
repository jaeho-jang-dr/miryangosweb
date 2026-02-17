#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NoterangConfig 유닛 테스트
"""
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from noterang.config import NoterangConfig, get_config, set_config, init_config, _config


class TestNoterangConfigDefaults:
    """기본값 테스트"""

    def test_default_timeout_slides_is_600(self):
        config = NoterangConfig()
        assert config.timeout_slides == 600, "timeout_slides 기본값은 600이어야 합니다 (300은 부족!)"

    def test_default_language_is_ko(self):
        config = NoterangConfig()
        assert config.default_language == "ko", "기본 언어는 반드시 한글 ko여야 합니다"

    def test_default_headless_is_false(self):
        config = NoterangConfig()
        assert config.browser_headless is False, "다운로드는 headless=False 권장"

    def test_default_viewport(self):
        config = NoterangConfig()
        assert config.browser_viewport_width == 1920
        assert config.browser_viewport_height == 1080

    def test_default_timeouts(self):
        config = NoterangConfig()
        assert config.timeout_research == 120
        assert config.timeout_download == 60
        assert config.timeout_login == 120

    def test_default_debug_off(self):
        config = NoterangConfig()
        assert config.debug is False

    def test_default_save_screenshots(self):
        config = NoterangConfig()
        assert config.save_screenshots is True

    def test_default_worker_id_none(self):
        config = NoterangConfig()
        assert config.worker_id is None


class TestNoterangConfigProperties:
    """프로퍼티 테스트"""

    def test_browser_profile_default(self, mock_config):
        profile = mock_config.browser_profile
        assert "browser_profile" in str(profile)
        # worker_id가 None이면 숫자 접미사 없음
        assert not profile.name.startswith("browser_profile_")

    def test_browser_profile_with_worker_id(self, tmp_path):
        config = NoterangConfig(
            download_dir=tmp_path / "dl",
            auth_dir=tmp_path / "auth",
            worker_id=3,
        )
        profile = config.browser_profile
        assert "browser_profile_3" in str(profile)

    def test_profile_dir(self, mock_config):
        assert "profiles" in str(mock_config.profile_dir)
        assert "default" in str(mock_config.profile_dir)

    def test_root_auth_file(self, mock_config):
        assert mock_config.root_auth_file.name == "auth.json"

    def test_memory_file(self, mock_config):
        assert mock_config.memory_file.name == "agent_memory.json"


class TestNoterangConfigSerialization:
    """직렬화/역직렬화 테스트"""

    def test_to_dict(self, mock_config):
        data = mock_config.to_dict()
        assert isinstance(data, dict)
        assert isinstance(data["download_dir"], str)
        assert isinstance(data["auth_dir"], str)
        assert data["timeout_slides"] == 600
        assert data["default_language"] == "ko"

    def test_from_dict(self, tmp_path):
        data = {
            "download_dir": str(tmp_path / "dl"),
            "auth_dir": str(tmp_path / "auth"),
            "timeout_slides": 500,
            "default_language": "en",
        }
        config = NoterangConfig.from_dict(data)
        assert config.timeout_slides == 500
        assert config.default_language == "en"
        assert isinstance(config.download_dir, Path)

    def test_from_dict_filters_invalid_keys(self, tmp_path):
        data = {
            "download_dir": str(tmp_path / "dl"),
            "nonexistent_field": "should_be_ignored",
        }
        config = NoterangConfig.from_dict(data)
        assert not hasattr(config, "nonexistent_field") or config.__dict__.get("nonexistent_field") is None

    def test_from_dict_skips_null_values(self, tmp_path):
        data = {
            "download_dir": str(tmp_path / "dl"),
            "timeout_slides": None,  # should be skipped -> default 600
        }
        config = NoterangConfig.from_dict(data)
        assert config.timeout_slides == 600

    def test_roundtrip_serialization(self, mock_config):
        data = mock_config.to_dict()
        restored = NoterangConfig.from_dict(data)
        assert str(restored.download_dir) == str(mock_config.download_dir)
        assert restored.timeout_slides == mock_config.timeout_slides
        assert restored.default_language == mock_config.default_language

    def test_save_and_load(self, mock_config, tmp_path):
        config_file = tmp_path / "test_config.json"
        mock_config.save(config_file)

        assert config_file.exists()

        loaded = NoterangConfig.load(config_file)
        assert loaded.timeout_slides == mock_config.timeout_slides
        assert loaded.default_language == mock_config.default_language

    def test_load_nonexistent_returns_default(self, tmp_path):
        config = NoterangConfig.load(tmp_path / "nonexistent.json")
        assert config.timeout_slides == 600
        assert config.default_language == "ko"

    def test_load_from_json_file(self, sample_config_json):
        config = NoterangConfig.load(sample_config_json)
        assert config.timeout_slides == 600
        assert config.default_language == "ko"
        assert config.debug is True


class TestNoterangConfigEnsureDirs:
    """디렉토리 생성 테스트"""

    def test_ensure_dirs_creates_directories(self, tmp_path):
        config = NoterangConfig(
            download_dir=tmp_path / "new_dl",
            auth_dir=tmp_path / "new_auth",
        )
        config.ensure_dirs()
        assert config.download_dir.exists()
        assert config.auth_dir.exists()
        assert config.browser_profile.exists()
        assert config.profile_dir.exists()


class TestGlobalConfig:
    """전역 설정 함수 테스트"""

    def test_set_and_get_config(self, mock_config):
        import noterang.config as cfg_module
        old = cfg_module._config
        try:
            set_config(mock_config)
            result = get_config()
            assert result.timeout_slides == mock_config.timeout_slides
        finally:
            cfg_module._config = old

    def test_init_config_with_kwargs(self, tmp_path):
        import noterang.config as cfg_module
        old = cfg_module._config
        try:
            cfg_module._config = None
            config = init_config(
                download_dir=str(tmp_path / "init_dl"),
                timeout_slides=700,
            )
            assert config.timeout_slides == 700
            assert str(config.download_dir) == str(tmp_path / "init_dl")
        finally:
            cfg_module._config = old
