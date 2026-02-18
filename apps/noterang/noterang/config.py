#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
노트랑 설정 관리
- 환경 설정 로드/저장
- API 키 관리
- 경로 설정
"""
import logging
import os
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

logger = logging.getLogger(__name__)

# Default paths
_DEFAULT_DOWNLOAD_DIR = "G:/내 드라이브/notebooklm"
_DEFAULT_AUTH_DIR_NAME = ".notebooklm-mcp-cli"
_CONFIG_FILENAME = "noterang_config.json"


@dataclass
class NoterangConfig:
    """Noterang application configuration.

    Manages all runtime settings including paths, API keys, timeouts,
    and browser preferences. Supports loading from JSON file and
    environment variables.
    """

    # 기본 경로
    download_dir: Path = field(default_factory=lambda: Path(os.environ.get('NOTEBOOKLM_DOWNLOAD_DIR', _DEFAULT_DOWNLOAD_DIR)))
    auth_dir: Path = field(default_factory=lambda: Path(os.environ.get('NOTEBOOKLM_AUTH_DIR', str(Path.home() / _DEFAULT_AUTH_DIR_NAME))))

    # API 키
    apify_api_key: str = ""
    notebooklm_app_password: str = ""  # 형식: "xxxx xxxx xxxx xxxx"

    # 타임아웃 설정 (초)
    timeout_slides: int = 600       # 10분 (300은 부족!)
    timeout_research: int = 120     # 2분
    timeout_download: int = 60      # 1분
    timeout_login: int = 120        # 2분

    # 브라우저 설정
    browser_headless: bool = False  # 다운로드는 headless=False 권장
    browser_viewport_width: int = 1920
    browser_viewport_height: int = 1080

    # 기본 언어
    default_language: str = "ko"    # 반드시 한글!

    # 디버그
    debug: bool = False
    save_screenshots: bool = True

    # 병렬 실행
    worker_id: Optional[int] = None  # 병렬 실행시 워커 ID

    @property
    def browser_profile(self) -> Path:
        base = self.auth_dir / "browser_profile"
        if self.worker_id is not None:
            return base.parent / f"browser_profile_{self.worker_id}"
        return base

    @property
    def profile_dir(self) -> Path:
        return self.auth_dir / "profiles" / "default"

    @property
    def root_auth_file(self) -> Path:
        return self.auth_dir / "auth.json"

    @property
    def memory_file(self) -> Path:
        return self.download_dir / "agent_memory.json"

    def ensure_dirs(self) -> None:
        """Create all required directories if they do not exist."""
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.auth_dir.mkdir(parents=True, exist_ok=True)
        self.browser_profile.mkdir(parents=True, exist_ok=True)
        self.profile_dir.mkdir(parents=True, exist_ok=True)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the configuration to a JSON-compatible dictionary.

        Returns:
            Dictionary with all fields; Path objects are converted to strings.
        """
        data: Dict[str, Any] = {}
        for key, value in asdict(self).items():
            data[key] = str(value) if isinstance(value, Path) else value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'NoterangConfig':
        """Deserialize a configuration from a dictionary.

        Args:
            data: Dictionary of configuration values. Unknown or null keys
                are silently ignored; defaults are used in their place.

        Returns:
            A new NoterangConfig instance.
        """
        # Drop null values — let dataclass defaults apply
        data = {k: v for k, v in data.items() if v is not None}

        # Drop keys that are not valid dataclass fields
        valid_fields = {f.name for f in cls.__dataclass_fields__.values()}
        data = {k: v for k, v in data.items() if k in valid_fields}

        # Convert string paths back to Path objects
        path_fields = ['download_dir', 'auth_dir']
        for field_name in path_fields:
            if field_name in data and isinstance(data[field_name], str):
                data[field_name] = Path(data[field_name])

        return cls(**data)

    def save(self, path: Optional[Path] = None) -> None:
        """Persist the configuration to a JSON file.

        Args:
            path: Destination file path. Defaults to ``noterang_config.json``
                in the project root.
        """
        save_path = path or (Path(__file__).parent.parent / _CONFIG_FILENAME)
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)

    @classmethod
    def load(cls, path: Optional[Path] = None) -> 'NoterangConfig':
        """Load configuration from a JSON file, falling back to environment variables.

        Args:
            path: Path to the JSON config file. Defaults to
                ``noterang_config.json`` in the project root.

        Returns:
            A populated NoterangConfig instance.
        """
        load_path = path or (Path(__file__).parent.parent / _CONFIG_FILENAME)

        if load_path.exists():
            with open(load_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return cls.from_dict(data)

        # Fall back to environment variables when no file exists
        config = cls()
        config.apify_api_key = os.environ.get('APIFY_API_KEY', '')
        config.notebooklm_app_password = os.environ.get('NOTEBOOKLM_APP_PASSWORD', '')
        return config


# Module-level singleton config instance
_config: Optional[NoterangConfig] = None


def get_config() -> NoterangConfig:
    """Return the global NoterangConfig singleton, loading it on first access.

    Returns:
        The application-wide NoterangConfig instance.
    """
    global _config
    if _config is None:
        _config = NoterangConfig.load()
        _config.ensure_dirs()
    return _config


def set_config(config: NoterangConfig) -> None:
    """Replace the global NoterangConfig singleton.

    Args:
        config: The new configuration instance to use globally.
    """
    global _config
    _config = config
    config.ensure_dirs()


def init_config(
    apify_api_key: str = "",
    notebooklm_app_password: str = "",
    download_dir: Optional[str] = None,
    **kwargs: Any,
) -> NoterangConfig:
    """Initialize and persist the global configuration with the supplied values.

    Any keyword argument that matches a field on :class:`NoterangConfig` will
    be applied directly.

    Args:
        apify_api_key: Apify API key string.
        notebooklm_app_password: NotebookLM app password (e.g. ``"xxxx xxxx xxxx xxxx"``).
        download_dir: Override for the download directory path.
        **kwargs: Additional NoterangConfig field overrides.

    Returns:
        The updated and saved NoterangConfig instance.
    """
    config = NoterangConfig.load()

    if apify_api_key:
        config.apify_api_key = apify_api_key
    if notebooklm_app_password:
        config.notebooklm_app_password = notebooklm_app_password
    if download_dir:
        config.download_dir = Path(download_dir)

    for key, value in kwargs.items():
        if hasattr(config, key):
            setattr(config, key, value)

    config.ensure_dirs()
    config.save()
    set_config(config)

    return config
