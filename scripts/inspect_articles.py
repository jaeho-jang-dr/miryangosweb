#!/usr/bin/env python3
"""최근 자료 상세 content 확인"""
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import firebase_admin
from firebase_admin import firestore as fs_admin

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': 'miryangosweb'})

db = fs_admin.client()
docs = db.collection('articles').order_by('createdAt', direction='DESCENDING').limit(5).get()

for doc in docs:
    data = doc.to_dict()
    title = data.get('title', '')
    content = data.get('content', '')
    summary = data.get('summary', '')
    tags = data.get('tags', [])
    attachment = data.get('attachmentUrl', '')
    images = data.get('images', [])

    print(f"\n{'='*60}")
    print(f"ID: {doc.id}")
    print(f"제목: {title}")
    print(f"태그: {tags}")
    print(f"요약: {summary[:100]}")
    print(f"첨부: {attachment[:80] if attachment else '없음'}")
    print(f"images 배열: {len(images)}개")
    print(f"content 길이: {len(content)}자")
    print(f"content 첫 500자:")
    print(f"---")
    print(content[:500])
    print(f"---")
