#!/usr/bin/env python3
"""문제 있는 자료실 기사 찾기 - content에 첫 슬라이드 이미지/목차 없는 것"""
import sys
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import firebase_admin
from firebase_admin import firestore as fs_admin

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': 'miryangosweb'})

db = fs_admin.client()
docs = db.collection('articles').order_by('createdAt', direction='DESCENDING').limit(20).get()

print(f"최근 {len(docs)}개 자료 검사\n")
print(f"{'ID':<24} {'제목':<20} {'이미지':^6} {'목차':^6} {'전체':^6} {'상태'}")
print("-" * 90)

bad_ids = []
for doc in docs:
    data = doc.to_dict()
    title = (data.get('title') or '')[:18]
    content = data.get('content') or ''

    has_image = '![' in content and '](' in content
    has_toc = '[슬라이드 목차]' in content
    has_full = '[전체 내용]' in content

    ok = has_image and has_toc
    status = "OK" if ok else "** 수정필요 **"

    if not ok:
        bad_ids.append(doc.id)

    print(f"{doc.id:<24} {title:<20} {'✅' if has_image else '❌':^6} {'✅' if has_toc else '❌':^6} {'✅' if has_full else '❌':^6} {status}")

print(f"\n수정 필요: {len(bad_ids)}개")
for bid in bad_ids:
    print(f"  {bid}")
