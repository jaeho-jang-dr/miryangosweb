#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
로컬에만 저장된 PDF/썸네일을 Firebase Storage에 업로드하고
Firestore 문서의 URL을 업데이트하는 마이그레이션 스크립트.

Usage:
    python scripts/upload_local_to_firebase.py              # dry-run (미리보기)
    python scripts/upload_local_to_firebase.py --apply      # 실제 적용
    python scripts/upload_local_to_firebase.py --check      # Firestore 문서 상태만 확인
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

# ─── 설정 ───────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
UPLOADS_DIR = PROJECT_ROOT / "public" / "uploads"
GDRIVE_NLM_DIR = Path("G:/내 드라이브/notebooklm")
STORAGE_BUCKET = "miryangosweb.firebasestorage.app"
FIREBASE_PROJECT_ID = "miryangosweb"


def init_firebase():
    """Firebase Admin 초기화 (ADC 또는 서비스 계정)"""
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        return

    sa_paths = [
        os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
        str(Path.home() / "Downloads" / "miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json"),
        str(PROJECT_ROOT / "firebase-service-account.json"),
    ]

    for sa_path in sa_paths:
        if sa_path and Path(sa_path).exists():
            print(f"  서비스 계정 사용: {sa_path}")
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred, {
                'projectId': FIREBASE_PROJECT_ID,
                'storageBucket': STORAGE_BUCKET,
            })
            return

    print("  ADC (Application Default Credentials) 사용")
    firebase_admin.initialize_app(options={
        'projectId': FIREBASE_PROJECT_ID,
        'storageBucket': STORAGE_BUCKET,
    })


def safe_file_size(path):
    """파일 크기 안전하게 가져오기 (NTFS ADS 문제 방지)"""
    try:
        p = Path(path)
        if not p.exists():
            return 0
        size = p.stat().st_size
        # 실제로 읽을 수 있는지 확인 (NTFS ADS로 인한 가짜 크기 방지)
        if size > 0:
            with open(p, 'rb') as f:
                f.read(1)
        return size
    except (OSError, PermissionError):
        return 0


def find_local_articles(db, only_with_local_url=False):
    """로컬 URL을 사용하는 Firestore 문서 찾기"""
    articles = db.collection('articles').order_by(
        'createdAt', direction='DESCENDING'
    ).get()

    local_articles = []
    for doc in articles:
        data = doc.to_dict()
        title = data.get('title', '')
        attachment_url = data.get('attachmentUrl', '')
        content = data.get('content', '')

        has_local_pdf = False
        has_local_content = False
        reasons = []

        # attachmentUrl이 로컬 경로인지 확인
        if attachment_url and attachment_url.startswith('/uploads/'):
            has_local_pdf = True
            reasons.append(f"PDF 로컬: {attachment_url}")

        # attachmentUrl이 비어있는지 확인
        if not attachment_url:
            has_local_pdf = True
            reasons.append("PDF URL 없음")

        # content에 로컬 이미지 URL 포함 여부
        if re.search(r'!\[.*?\]\(/uploads/[^)]+\)', content):
            has_local_content = True
            reasons.append("content 로컬 이미지")

        # only_with_local_url 모드: URL 없는 기사(테스트 데이터)는 건너뜀
        if only_with_local_url and not has_local_pdf and not has_local_content:
            continue

        if has_local_pdf or has_local_content:
            local_articles.append({
                'id': doc.id,
                'title': title,
                'data': data,
                'has_local_pdf': has_local_pdf,
                'has_local_content': has_local_content,
                'reasons': reasons,
            })

    return local_articles


def find_pdf_file(attachment_url):
    """attachmentUrl로부터 실제 PDF 파일 찾기"""
    if not attachment_url or not attachment_url.startswith('/uploads/'):
        return None

    local_name = attachment_url.lstrip('/uploads/')
    if not local_name:
        return None

    # 직접 경로
    local_path = UPLOADS_DIR / local_name
    if local_path.exists() and safe_file_size(local_path) > 0:
        return local_path

    # Windows NTFS 콜론 문제: 콜론 앞까지만 사용 (ADS 무시)
    if ':' in local_name:
        base_name = local_name.split(':')[0]
        # .pdf 확장자 붙여서 시도
        for suffix in ['.pdf', '']:
            candidate = UPLOADS_DIR / f"{base_name}{suffix}"
            if candidate.exists() and safe_file_size(candidate) > 0:
                return candidate

    # attachment URL의 타임스탬프로 Google Drive에서 매칭
    ts_match = re.search(r'(\d{8})_(\d{6})', local_name)
    if ts_match and GDRIVE_NLM_DIR.exists():
        date_str = ts_match.group(1)  # 20260212
        time_str = ts_match.group(2)  # 022155

        # Google Drive의 slides_YYYYMMDD_HHMMSS.pdf와 시간 매칭 (±5분)
        from datetime import datetime as dt, timedelta
        try:
            article_time = dt.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
        except ValueError:
            return None

        best_match = None
        best_diff = timedelta(minutes=5)

        for f in GDRIVE_NLM_DIR.glob("slides_*.pdf"):
            gdrive_ts = re.search(r'slides_(\d{8}_\d{6})\.pdf', f.name)
            if gdrive_ts:
                try:
                    gdrive_time = dt.strptime(gdrive_ts.group(1), "%Y%m%d_%H%M%S")
                except ValueError:
                    continue
                diff = abs(article_time - gdrive_time)
                if diff < best_diff:
                    best_diff = diff
                    best_match = f

        if best_match and safe_file_size(best_match) > 0:
            return best_match

    return None


def find_thumb_file(attachment_url):
    """attachmentUrl 기반으로 해당 문서의 썸네일 찾기"""
    if not attachment_url or not attachment_url.startswith('/uploads/'):
        return None

    local_name = attachment_url.lstrip('/uploads/')
    if not local_name:
        return None

    # UUID + 제목 패턴 추출 (noterang_YYYYMMDD_HHMMSS_UUID_제목)
    uid_match = re.search(r'noterang_(\d{8}_\d{6}_[a-f0-9]{8})', local_name)
    if uid_match:
        prefix = uid_match.group(0)
        for f in UPLOADS_DIR.glob(f"{prefix}*_thumb.png"):
            if safe_file_size(f) > 0:
                return f

    # 타임스탬프로 매칭
    ts_match = re.search(r'noterang_(\d{8}_\d{6})', local_name)
    if ts_match:
        ts_prefix = ts_match.group(0)
        for f in UPLOADS_DIR.glob(f"{ts_prefix}*_thumb.png"):
            if safe_file_size(f) > 0:
                return f

    return None


def upload_to_storage(bucket, local_path, storage_path, content_type=None):
    """Firebase Storage에 파일 업로드"""
    blob = bucket.blob(storage_path)

    if not content_type:
        ext = Path(local_path).suffix.lower()
        content_type = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
        }.get(ext, 'application/octet-stream')

    blob.upload_from_filename(str(local_path), content_type=content_type)

    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket.name}/o/{storage_path.replace('/', '%2F')}?alt=media"
    return url


def check_articles(db):
    """Firestore 문서 상태 확인 (읽기 전용)"""
    print("\n" + "=" * 60)
    print("  Firestore 자료실 문서 상태 확인")
    print("=" * 60)

    articles = db.collection('articles').order_by(
        'createdAt', direction='DESCENDING'
    ).get()

    local_count = 0
    firebase_count = 0

    for doc in articles:
        data = doc.to_dict()
        title = data.get('title', '')[:40]
        url = data.get('attachmentUrl', '')
        content = data.get('content', '')

        is_local = (
            url.startswith('/uploads/')
            or not url
            or bool(re.search(r'!\[.*?\]\(/uploads/', content))
        )

        if is_local:
            local_count += 1
            status = "❌ 로컬"
        else:
            firebase_count += 1
            status = "✅ Firebase"

        print(f"  {status}  {doc.id[:8]}...  {title}")
        if is_local:
            if url:
                print(f"           URL: {url[:80]}")
            else:
                print(f"           URL: (없음)")

    print(f"\n  합계: Firebase {firebase_count}개, 로컬 {local_count}개")
    print(f"  수정 필요: {local_count}개")


def migrate_articles(db, apply=False):
    """로컬 파일을 Firebase Storage로 마이그레이션"""
    from firebase_admin import storage

    print("\n" + "=" * 60)
    mode = "실행" if apply else "미리보기 (--apply 로 적용)"
    print(f"  Firebase Storage 마이그레이션 [{mode}]")
    print("=" * 60)

    local_articles = find_local_articles(db)

    if not local_articles:
        print("\n  ✅ 모든 문서가 Firebase Storage URL을 사용 중입니다.")
        return

    print(f"\n  로컬 URL 사용 문서: {len(local_articles)}개\n")

    bucket = storage.bucket() if apply else None
    success_count = 0
    fail_count = 0
    skip_count = 0

    for article in local_articles:
        doc_id = article['id']
        title = article['title']
        data = article['data']
        attachment_url = data.get('attachmentUrl', '')
        content = data.get('content', '')
        has_local_pdf = article['has_local_pdf']
        has_local_content = article['has_local_content']

        print(f"\n  [{doc_id[:8]}] {title}")
        for reason in article['reasons']:
            print(f"    문제: {reason}")

        # PDF가 이미 Firebase에 있는 경우 (content만 수정 필요)
        pdf_already_firebase = (
            attachment_url
            and not attachment_url.startswith('/uploads/')
            and attachment_url.startswith('http')
        )

        # PDF 파일 찾기
        pdf_path = None
        if has_local_pdf:
            pdf_path = find_pdf_file(attachment_url)
            if pdf_path:
                print(f"    PDF 발견: {pdf_path.name} ({safe_file_size(pdf_path) / 1024 / 1024:.1f}MB)")
            else:
                print(f"    ⚠️ PDF 파일 없음 (URL 비어있거나 파일 없음)")
                if not has_local_content:
                    skip_count += 1
                    continue

        # 썸네일 찾기
        thumb_path = find_thumb_file(attachment_url)
        if thumb_path:
            print(f"    썸네일 발견: {thumb_path.name}")

        if not apply:
            if pdf_path:
                print(f"    → PDF를 Firebase Storage에 업로드 예정")
            if thumb_path:
                print(f"    → 썸네일을 Firebase Storage에 업로드 예정")
            if has_local_content:
                print(f"    → content 이미지 URL 교체 예정")
            continue

        # Firebase Storage 업로드
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            uid = uuid.uuid4().hex[:8]
            safe_title = title.replace(" ", "_").replace("/", "-").replace(":", "")

            update_data = {}
            new_thumb_url = None

            # PDF 업로드
            if pdf_path and has_local_pdf:
                pdf_storage_path = f"articles/{ts}_{uid}_{safe_title}.pdf"
                new_pdf_url = upload_to_storage(bucket, pdf_path, pdf_storage_path)
                update_data['attachmentUrl'] = new_pdf_url
                update_data['attachmentName'] = f"{safe_title}.pdf"
                update_data['pdfUrl'] = new_pdf_url
                print(f"    ✅ PDF 업로드 완료: {pdf_storage_path}")

            # 썸네일 업로드
            if thumb_path:
                thumb_storage_path = f"articles/{ts}_{uid}_{safe_title}_thumb.png"
                new_thumb_url = upload_to_storage(bucket, thumb_path, thumb_storage_path)
                print(f"    ✅ 썸네일 업로드 완료: {thumb_storage_path}")

            # content에서 로컬 URL 치환
            if has_local_content and new_thumb_url:
                new_content = re.sub(
                    r'(/uploads/noterang_[^)"\s]+_thumb\.png)',
                    new_thumb_url,
                    content
                )
                if new_content != content:
                    update_data['content'] = new_content
                    print(f"    ✅ content 이미지 URL 교체 완료")

            # Firestore 업데이트
            if update_data:
                db.collection('articles').document(doc_id).update(update_data)
                print(f"    ✅ Firestore 업데이트 완료")
                success_count += 1
            else:
                print(f"    ⚠️ 업데이트할 항목 없음")
                skip_count += 1

        except Exception as e:
            print(f"    ❌ 업로드 실패: {e}")
            import traceback
            traceback.print_exc()
            fail_count += 1

    print(f"\n  결과: 성공 {success_count}개, 실패 {fail_count}개, 건너뜀 {skip_count}개")
    if not apply:
        print(f"\n  실제 적용하려면: python scripts/upload_local_to_firebase.py --apply")


def main():
    parser = argparse.ArgumentParser(
        description="로컬 PDF/썸네일을 Firebase Storage로 마이그레이션"
    )
    parser.add_argument('--apply', action='store_true', help="실제 Firebase에 업로드 및 업데이트")
    parser.add_argument('--check', action='store_true', help="Firestore 문서 상태만 확인")
    args = parser.parse_args()

    init_firebase()

    from firebase_admin import firestore as fs_admin
    db = fs_admin.client()

    if args.check:
        check_articles(db)
    else:
        migrate_articles(db, apply=args.apply)


if __name__ == '__main__':
    main()
