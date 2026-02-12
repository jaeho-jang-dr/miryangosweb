#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3개 누락 article을 기존 파이프라인 방식으로 제대로 업데이트
- PDFAnalyzer로 텍스트/제목/키워드 추출
- 썸네일 생성 → Firebase Storage 업로드
- Firestore 문서를 기존 형식에 맞게 업데이트
"""
import sys
import os
import json

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, 'D:/Entertainments/DevEnvironment/miryangosweb/apps/notebooklm-automation')

from pathlib import Path
from apps.web_publisher.pdf_analyzer import PDFAnalyzer
from apps.web_publisher.body_parts import match_body_part

import firebase_admin
from firebase_admin import credentials, firestore, storage

SERVICE_ACCOUNT = 'c:/Users/antigravity/Downloads/miryangosweb-firebase-adminsdk-fbsvc-e139abbe14.json'
STORAGE_BUCKET = 'miryangosweb.firebasestorage.app'
GOOGLE_DRIVE_DIR = Path('G:/내 드라이브/notebooklm')

# Load .env.local for Vision API key
from dotenv import load_dotenv
load_dotenv(Path('D:/Entertainments/DevEnvironment/miryangosweb/.env.local'))
VISION_API_KEY = os.getenv('GOOGLE_VISION_API_KEY', '')

# Init Firebase
cred = credentials.Certificate(SERVICE_ACCOUNT)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {'storageBucket': STORAGE_BUCKET})

db = firestore.client()
bucket = storage.bucket(STORAGE_BUCKET)

ARTICLES = [
    {
        'doc_id': '5dIic2T3fYmBiAVnYJlW',
        'title': '무릎 골연화증',
        'pdf_file': '0c612714_slides.pdf',
    },
    {
        'doc_id': 'kV0JI1NBjljHD1qFQbr6',
        'title': '족모지통풍관절염',
        'pdf_file': 'badb30d4_slides.pdf',
    },
    {
        'doc_id': 'mi4fb9Iy6RKeT3KfdFQL',
        'title': '아킬레스건염',
        'pdf_file': '0bde57a4_slides.pdf',
    },
]


def upload_to_storage(data: bytes, storage_path: str, content_type: str) -> str:
    blob = bucket.blob(storage_path)
    blob.upload_from_string(data, content_type=content_type)
    blob.make_public()
    return blob.public_url


def main():
    print("=" * 60)
    print("  3개 article 정식 파이프라인 업데이트")
    print("=" * 60)

    for article in ARTICLES:
        title = article['title']
        doc_id = article['doc_id']
        pdf_path = GOOGLE_DRIVE_DIR / article['pdf_file']

        print(f"\n--- [{title}] ---")

        if not pdf_path.exists():
            print(f"  PDF 없음: {pdf_path}")
            continue

        # Step 1: PDF 분석
        print("\n[1/3] PDF 분석...")
        analyzer = PDFAnalyzer(pdf_path, vision_api_key=VISION_API_KEY)
        try:
            analysis = analyzer.analyze()
            thumbnail = analyzer.generate_thumbnail(0)
        finally:
            analyzer.close()

        page_count = analysis['page_count']
        titles = analysis.get('titles', [])
        keywords = analysis.get('keywords', [])
        summary_text = analysis.get('summary', '')
        content_text = analysis.get('content', '')

        # Step 2: 썸네일 업로드
        print("\n[2/3] 썸네일 Firebase Storage 업로드...")
        safe_title = title.replace(' ', '_').replace('/', '-')
        thumb_path = f"articles/noterang_{safe_title}_thumb.png"
        thumb_url = upload_to_storage(thumbnail, thumb_path, 'image/png')
        print(f"  썸네일: {thumb_url}")

        # Step 3: Firestore 문서 업데이트 (기존 파이프라인 형식)
        print("\n[3/3] Firestore 업데이트...")

        # 요약 생성 (슬라이드 제목 기반)
        if titles:
            title_summary = " / ".join(titles[:6])
            summary = f"{title} - {title_summary}"
            if len(titles) > 6:
                summary += f" 외 {len(titles) - 6}장"
        else:
            summary = f"{title}에 대해 알기 쉽게 정리한 슬라이드 자료입니다."

        # 본문 구성 (기존 형식: 썸네일 이미지 + 슬라이드 목차 + 전체 텍스트)
        content_parts = []

        # 첫 페이지 이미지 (markdown)
        if thumb_url:
            content_parts.append(f"![{title}]({thumb_url})\n")

        # 슬라이드 목차
        if summary_text:
            content_parts.append(f"\n[슬라이드 목차]\n{summary_text}\n")

        # 전체 텍스트 (8000자 제한)
        if content_text:
            if len(content_text) > 8000:
                content_text = content_text[:8000] + "\n\n... (이하 생략)"
            content_parts.append(f"\n[전체 내용]\n{content_text}")

        # 태그 생성
        design_tag = "인포그래픽"
        tags = ["자동생성", "노트랑", design_tag]

        body_part = match_body_part(keywords, title)
        from apps.web_publisher.body_parts import BODY_PARTS
        if body_part != "etc":
            part_info = next((p for p in BODY_PARTS if p["id"] == body_part), None)
            if part_info:
                tags.append(part_info["label"])

        for word in title.split():
            if len(word) >= 2 and word not in tags:
                tags.append(word)

        for kw in keywords[:5]:
            if kw not in tags and len(kw) >= 2:
                tags.append(kw)

        # 현재 PDF URL 가져오기
        current_doc = db.collection('articles').document(doc_id).get()
        current_data = current_doc.to_dict() if current_doc.exists else {}
        pdf_url = current_data.get('attachmentUrl', '')

        # Firestore 업데이트
        update_data = {
            'title': title,
            'type': 'disease',
            'tags': tags,
            'summary': summary[:200],
            'content': "\n".join(content_parts),
            'attachmentUrl': pdf_url,
            'attachmentName': Path(pdf_url).name if pdf_url else f'{safe_title}.pdf',
            'images': [],
            'isVisible': True,
        }

        db.collection('articles').document(doc_id).set(update_data, merge=True)
        print(f"  업데이트 완료!")
        print(f"  제목: {title}")
        print(f"  슬라이드: {page_count}장")
        print(f"  태그: {tags}")
        print(f"  요약: {summary[:60]}...")
        print(f"  썸네일: {thumb_url}")

    print("\n" + "=" * 60)
    print("  완료!")
    print("=" * 60)


if __name__ == '__main__':
    main()
