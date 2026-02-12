#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
6개 특정 문서의 PDF를 Firebase Storage에 업로드하고 Firestore 업데이트.

대상:
  - 헬스 운동후 아파요 1부, 2부
  - 노년기 부상이 생기는 원인과 주변 환경 관리와 정돈법
  - 노년기 골절 1부, 2부, 3부

Usage:
    python scripts/upload_6_articles.py              # dry-run
    python scripts/upload_6_articles.py --apply      # 실제 적용
"""
import argparse
import os
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).parent.parent
UPLOADS_DIR = PROJECT_ROOT / "public" / "uploads"
GDRIVE_NLM_DIR = Path("G:/내 드라이브/notebooklm")
STORAGE_BUCKET = "miryangosweb.firebasestorage.app"

# ─── 6개 문서 매핑 (Firestore DocID → PDF 파일 경로) ─────────
ARTICLES = [
    {
        "doc_id": "TDIr9YqhEG60Uc8Jd57A",
        "title": "헬스 운동후 아파요 1부",
        "pdf_source": GDRIVE_NLM_DIR / "slides_20260212_022047.pdf",
        "thumb_source": None,  # 0바이트 파일만 있음 → PDF에서 자동 생성
    },
    {
        "doc_id": "6zv569DuCEiH1sO5XzaK",
        "title": "헬스 운동후 아파요 2부",
        "pdf_source": GDRIVE_NLM_DIR / "slides_20260212_024453.pdf",
        "thumb_source": None,  # → PDF에서 자동 생성
    },
    {
        "doc_id": "aORJO0lLT6wwo79MtzkJ",
        "title": "노년기 부상이 생기는 원인",
        "pdf_source": None,  # PDF는 이미 Firebase → content 이미지만 확인
        "thumb_source": None,
    },
    {
        "doc_id": "9DlqcV1cFc4TSb11JmrE",
        "title": "노년기 골절 1부 손목골절",
        "pdf_source": UPLOADS_DIR / "noterang_20260212_033522_45cfdf71_노년기_골절_1부_손목골절.pdf",
        "thumb_source": UPLOADS_DIR / "noterang_20260212_033522_45cfdf71_노년기_골절_1부_손목골절_thumb.png",
    },
    {
        "doc_id": "R0h7uHa0zOpQNogdoaBz",
        "title": "노년기 골절 2부 척추압박골절",
        "pdf_source": UPLOADS_DIR / "noterang_20260212_034532_449d24e9_노년기_골절_2부_척추압박골절.pdf",
        "thumb_source": UPLOADS_DIR / "noterang_20260212_034532_449d24e9_노년기_골절_2부_척추압박골절_thumb.png",
    },
    {
        "doc_id": "ivckUGhMs3eMHlzZrhom",
        "title": "노년기 골절 3부 고관절 대퇴골 골절",
        "pdf_source": UPLOADS_DIR / "noterang_20260212_035526_1405fc26_노년기_골절_3부_고관절_대퇴골_골절.pdf",
        "thumb_source": UPLOADS_DIR / "noterang_20260212_035526_1405fc26_노년기_골절_3부_고관절_대퇴골_골절_thumb.png",
    },
]


def init_firebase():
    import firebase_admin
    if firebase_admin._apps:
        return

    sa_paths = [
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
        str(Path.home() / "Downloads" / "miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json"),
        str(PROJECT_ROOT / "firebase-service-account.json"),
    ]
    for sa_path in sa_paths:
        if sa_path and Path(sa_path).exists():
            print(f"  서비스 계정: {sa_path}")
            cred = firebase_admin.credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'miryangosweb',
                'storageBucket': STORAGE_BUCKET,
            })
            return

    print("  ADC 사용")
    firebase_admin.initialize_app(options={
        'projectId': 'miryangosweb',
        'storageBucket': STORAGE_BUCKET,
    })


def upload_file(bucket, local_path, storage_path, content_type):
    """Firebase Storage에 파일 업로드 → public URL 반환"""
    blob = bucket.blob(storage_path)
    blob.upload_from_filename(str(local_path), content_type=content_type)
    encoded = storage_path.replace('/', '%2F')
    return f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{encoded}?alt=media"


def generate_thumbnail(pdf_path):
    """PDF 첫 페이지에서 썸네일 PNG 생성"""
    try:
        import fitz
        doc = fitz.open(str(pdf_path))
        page = doc[0]
        mat = fitz.Matrix(1.5, 1.5)
        pix = page.get_pixmap(matrix=mat)
        png_bytes = pix.tobytes("png")
        doc.close()
        return png_bytes
    except Exception as e:
        print(f"    ⚠️ 썸네일 생성 실패: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="6개 문서 Firebase 업로드")
    parser.add_argument('--apply', action='store_true', help="실제 적용")
    args = parser.parse_args()

    init_firebase()

    from firebase_admin import firestore as fs_admin, storage
    db = fs_admin.client()
    bucket = storage.bucket() if args.apply else None

    mode = "실행" if args.apply else "미리보기"
    print(f"\n{'=' * 60}")
    print(f"  6개 문서 Firebase Storage 업로드 [{mode}]")
    print(f"{'=' * 60}")

    success = 0
    skip = 0
    fail = 0

    for art in ARTICLES:
        doc_id = art["doc_id"]
        title = art["title"]
        pdf_source = art["pdf_source"]
        thumb_source = art["thumb_source"]

        print(f"\n  [{doc_id[:8]}] {title}")

        # Firestore 현재 상태 확인
        doc_ref = db.collection('articles').document(doc_id)
        doc = doc_ref.get()
        if not doc.exists:
            print(f"    ❌ Firestore 문서 없음!")
            fail += 1
            continue

        data = doc.to_dict()
        current_url = data.get('attachmentUrl', '')
        content = data.get('content', '')

        # 이미 Firebase URL이 있고 content에도 로컬 이미지 없으면 건너뜀
        is_firebase_url = current_url.startswith('http') and 'firebase' in current_url.lower()
        has_local_img = bool(re.search(r'!\[.*?\]\(/uploads/', content))

        if is_firebase_url and not has_local_img:
            print(f"    ✅ 이미 Firebase에 있음: {current_url[:60]}...")
            skip += 1
            continue

        if is_firebase_url and has_local_img:
            print(f"    PDF는 Firebase에 있으나 content에 로컬 이미지 있음")

        # PDF 파일 확인
        if pdf_source and pdf_source.exists() and pdf_source.stat().st_size > 0:
            mb = pdf_source.stat().st_size / 1024 / 1024
            print(f"    PDF: {pdf_source.name} ({mb:.1f}MB)")
        elif pdf_source:
            print(f"    ⚠️ PDF 파일 없음 또는 0바이트: {pdf_source}")
            if not has_local_img:
                fail += 1
                continue
            pdf_source = None  # PDF 업로드 건너뛰고 content만 수정
        else:
            pdf_source = None  # PDF 업로드 안 함

        # 썸네일 확인
        if thumb_source and thumb_source.exists() and thumb_source.stat().st_size > 0:
            print(f"    썸네일: {thumb_source.name}")
        else:
            thumb_source = None
            # PDF에서 자동 생성
            if pdf_source:
                print(f"    썸네일 없음 → PDF에서 자동 생성 예정")

        if not args.apply:
            print(f"    → --apply 시 업로드 예정")
            continue

        # ─── 업로드 실행 ─────────────────────────────
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            uid = uuid.uuid4().hex[:8]
            safe = title.replace(" ", "_").replace("/", "-").replace(":", "")

            update_data = {}
            new_thumb_url = None

            # PDF 업로드
            if pdf_source:
                spath = f"articles/{ts}_{uid}_{safe}.pdf"
                new_url = upload_file(bucket, pdf_source, spath, 'application/pdf')
                update_data['attachmentUrl'] = new_url
                update_data['attachmentName'] = f"{safe}.pdf"
                update_data['pdfUrl'] = new_url
                print(f"    ✅ PDF 업로드: {spath}")

            # 썸네일 업로드
            if thumb_source:
                tpath = f"articles/{ts}_{uid}_{safe}_thumb.png"
                new_thumb_url = upload_file(bucket, thumb_source, tpath, 'image/png')
                print(f"    ✅ 썸네일 업로드 (파일): {tpath}")
            elif pdf_source:
                # PDF에서 썸네일 자동 생성
                png_bytes = generate_thumbnail(pdf_source)
                if png_bytes:
                    import tempfile
                    tmp = Path(tempfile.mktemp(suffix='.png'))
                    tmp.write_bytes(png_bytes)
                    tpath = f"articles/{ts}_{uid}_{safe}_thumb.png"
                    new_thumb_url = upload_file(bucket, tmp, tpath, 'image/png')
                    tmp.unlink()
                    print(f"    ✅ 썸네일 업로드 (자동 생성): {tpath}")

            # content 수정: 로컬 이미지 URL → Firebase URL
            new_content = content
            if new_thumb_url and has_local_img:
                new_content = re.sub(
                    r'!\[([^\]]*)\]\(/uploads/[^)]+_thumb\.png\)',
                    f'![\\1]({new_thumb_url})',
                    new_content
                )
                if new_content != content:
                    update_data['content'] = new_content
                    print(f"    ✅ content 이미지 URL 교체")

            # Firestore 업데이트
            if update_data:
                doc_ref.update(update_data)
                print(f"    ✅ Firestore 업데이트 완료 ({len(update_data)}개 필드)")
                success += 1
            else:
                print(f"    ⚠️ 변경 사항 없음")
                skip += 1

        except Exception as e:
            print(f"    ❌ 실패: {e}")
            import traceback
            traceback.print_exc()
            fail += 1

    print(f"\n{'=' * 60}")
    print(f"  결과: 성공 {success}개, 건너뜀 {skip}개, 실패 {fail}개")
    print(f"{'=' * 60}")
    if not args.apply:
        print(f"\n  실제 적용: python scripts/upload_6_articles.py --apply")


if __name__ == '__main__':
    main()
