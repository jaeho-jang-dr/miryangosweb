#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Miryang Orthopedic Web - System Doctor
이 스크립트는 현재 개발 환경(PC)이 정상적으로 설정되었는지 확인합니다.
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path
from dotenv import load_dotenv

def check_command(cmd, name):
    path = shutil.which(cmd)
    if path:
        print(f"✅ {name}: Found ({path})")
        return True
    else:
        print(f"❌ {name}: NOT FOUND ('{cmd}' is not in PATH)")
        return False

def check_env_file():
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        print(f"✅ .env.local: Found")
        load_dotenv(env_path)
        return True
    else:
        print(f"❌ .env.local: NOT FOUND (Copy from .env.example)")
        return False

def main():
    print("=" * 60)
    print("🏥 Miryang OS System Diagnostic")
    print("=" * 60)

    # 1. Basic Tools
    print("\n[1/3] Basic Tools")
    check_command("npm", "Node.js (npm)")
    check_command("python", "Python")
    check_command("git", "Git")

    # 2. Environment Configuration
    print("\n[2/3] Environment Configuration")
    if check_env_file():
        # Firebase
        sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if sa_path:
            p = Path(sa_path)
            if p.exists():
                print(f"✅ Firebase Service Account: Valid ({p})")
            else:
                print(f"❌ Firebase Service Account: Path exists in .env but FILE MISSING ({p})")
        else:
            print("⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set in .env.local")

        # Google Drive
        drive_path = os.getenv("NOTEBOOKLM_DOWNLOAD_DIR")
        if drive_path:
            p = Path(drive_path)
            if p.exists():
                print(f"✅ Google Drive Path: Valid ({p})")
            else:
                print(f"❌ Google Drive Path: NOT ACCESSIBLE ({p}) - Check Drive mount")
        else:
            print("⚠️ NOTEBOOKLM_DOWNLOAD_DIR not set in .env.local")

        # Ghostscript/GraphicsMagick
        gm_path = os.getenv("GRAPHICSMAGICK_PATH")
        if gm_path and Path(gm_path).exists():
            print(f"✅ GraphicsMagick: Found ({gm_path})")
        else:
            print(f"❌ GraphicsMagick: Invalid path in .env.local")

    # 3. Directory Structure
    print("\n[3/3] Directory Integrity")
    project_root = Path(__file__).parent.parent
    apps_dir = project_root / "apps"
    if apps_dir.exists():
        print(f"✅ Apps directory: Found")
        for app in ["noterang", "notebooklm-automation"]:
            if (apps_dir / app).exists():
                print(f"   - {app}: Found")
            else:
                print(f"   - {app}: MISSING")
    else:
        print(f"❌ Apps directory: MISSING")

    print("\n" + "=" * 60)
    print("🩺 Diagnostic Complete")
    print("=" * 60)

if __name__ == "__main__":
    main()
