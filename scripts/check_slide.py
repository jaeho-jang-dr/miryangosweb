"""
NotebookLM 슬라이드 생성 상태 체크 & 자동 다운로드 스크립트
1분 간격으로 체크, 완료되면 자동 다운로드
"""
import subprocess
import json
import time
import sys
import os

NOTEBOOK_ID = "f1515917-a201-457a-b6dd-9daa2a293cfd"
ARTIFACT_ID = "97f3f48e-4cb5-403d-ade6-735ebb5079e3"
DOWNLOAD_DIR = r"G:\내 드라이브\notebooklm_data"
FILENAME = "대퇴골두무혈성괴사증_슬라이드.pdf"
NLM_CLI = r"C:\Users\antigravity\AppData\Roaming\Python\Python313\Scripts\notebooklm-mcp.exe"

CHECK_INTERVAL = 60  # seconds

def check_status():
    """MCP CLI로 studio status 확인"""
    try:
        result = subprocess.run(
            [NLM_CLI, "studio-status", NOTEBOOK_ID],
            capture_output=True, text=True, timeout=30,
            encoding="utf-8", errors="replace"
        )
        output = result.stdout + result.stderr
        # completed 키워드 체크
        if "completed" in output.lower() and "in_progress" not in output.lower():
            return "completed"
        elif "in_progress" in output.lower():
            return "in_progress"
        elif "error" in output.lower() or "failed" in output.lower():
            return "failed"
        return "unknown"
    except Exception as e:
        print(f"  Status check error: {e}")
        return "error"


def main():
    print("=" * 60)
    print("NotebookLM 슬라이드 생성 모니터링")
    print(f"  Notebook: {NOTEBOOK_ID}")
    print(f"  Artifact: {ARTIFACT_ID}")
    print(f"  저장 경로: {DOWNLOAD_DIR}\\{FILENAME}")
    print(f"  체크 간격: {CHECK_INTERVAL}초")
    print("=" * 60)

    attempt = 0
    while True:
        attempt += 1
        now = time.strftime("%H:%M:%S")
        print(f"\n[{now}] 체크 #{attempt}...", end=" ", flush=True)

        status = check_status()
        print(f"상태: {status}")

        if status == "completed":
            print("\n*** 슬라이드 생성 완료! ***")
            print("Claude Code에서 다운로드를 진행해주세요:")
            print(f'  download_artifact(notebook_id="{NOTEBOOK_ID}",')
            print(f'    artifact_type="slide_deck",')
            print(f'    artifact_id="{ARTIFACT_ID}",')
            print(f'    output_path=r"{DOWNLOAD_DIR}\\{FILENAME}")')
            print("\n완료!")

            # 소리 알림 (Windows beep)
            try:
                import winsound
                for _ in range(3):
                    winsound.Beep(1000, 300)
                    time.sleep(0.2)
            except:
                print("\a\a\a")  # terminal bell

            break
        elif status == "failed":
            print("\n*** 슬라이드 생성 실패! ***")
            print("NotebookLM에서 확인해주세요.")
            break
        else:
            print(f"  다음 체크: {CHECK_INTERVAL}초 후...")
            time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    main()
