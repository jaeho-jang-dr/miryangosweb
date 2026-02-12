#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
기존 자료 content 수정:
  - [슬라이드 N] 패턴에서 제목 추출 → [슬라이드 목차] 생성
  - 이미지 뒤, [전체 내용] 앞에 목차 삽입

Usage:
    python scripts/fix_articles.py              # dry-run (미리보기)
    python scripts/fix_articles.py --apply      # 실제 적용
    python scripts/fix_articles.py --id ABC123  # 특정 문서만
"""
import argparse
import re
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

import firebase_admin
from firebase_admin import firestore as fs_admin

if not firebase_admin._apps:
    firebase_admin.initialize_app(options={'projectId': 'miryangosweb'})

db = fs_admin.client()


def extract_slide_titles(content: str) -> list[str]:
    """[전체 내용] 블록에서 [슬라이드 N] 다음 첫 줄(제목)을 추출"""
    titles = []
    # [슬라이드 1]\n제목텍스트 패턴 찾기
    pattern = r'\[슬라이드\s*(\d+)\]\s*\n(.+?)(?:\n|$)'
    matches = re.findall(pattern, content)
    for num, title_line in matches:
        title = title_line.strip()
        # 너무 짧거나 무의미한 줄은 건너뜀
        if len(title) >= 2 and not title.startswith('['):
            titles.append(title)
    return titles


def build_toc(titles: list[str]) -> str:
    """슬라이드 제목 목록으로 목차 텍스트 생성"""
    lines = []
    for i, title in enumerate(titles, 1):
        # 제목이 너무 길면 자르기
        short = title[:60] + '...' if len(title) > 60 else title
        lines.append(f"{i}. {short}")
    return "\n".join(lines)


def fix_article_content(content: str) -> tuple[str, bool, str]:
    """
    content에 [슬라이드 목차] 삽입

    Returns: (fixed_content, was_changed, reason)
    """
    # 이미 목차가 있으면 건너뜀
    if '[슬라이드 목차]' in content:
        return content, False, "이미 목차 있음"

    # 슬라이드 제목 추출
    titles = extract_slide_titles(content)
    if not titles:
        return content, False, "슬라이드 제목 추출 불가"

    toc_text = build_toc(titles)
    toc_block = f"\n[슬라이드 목차]\n{toc_text}\n"

    # [전체 내용] 앞에 삽입
    if '[전체 내용]' in content:
        # 이미지가 있는 경우: ![...](...)  뒤, [전체 내용] 앞
        fixed = content.replace(
            '\n[전체 내용]',
            f'{toc_block}\n[전체 내용]'
        )
        return fixed, True, f"목차 {len(titles)}항목 삽입"
    else:
        # [전체 내용] 태그 없는 경우 → content 맨 앞에 삽입
        fixed = toc_block + "\n" + content
        return fixed, True, f"목차 {len(titles)}항목 (앞부분) 삽입"


def main():
    parser = argparse.ArgumentParser(description="자료실 content 수정")
    parser.add_argument('--apply', action='store_true', help="실제 Firestore에 적용")
    parser.add_argument('--id', help="특정 문서 ID만 수정")
    parser.add_argument('--limit', type=int, default=30, help="최대 문서 수 (기본 30)")
    args = parser.parse_args()

    if args.id:
        doc_ref = db.collection('articles').document(args.id)
        doc = doc_ref.get()
        if not doc.exists:
            print(f"문서 {args.id} 를 찾을 수 없습니다.")
            return
        docs = [doc]
    else:
        docs = db.collection('articles').order_by(
            'createdAt', direction='DESCENDING'
        ).limit(args.limit).get()

    mode = "적용" if args.apply else "미리보기 (--apply 로 실행)"
    print(f"\n자료실 content 수정 [{mode}]")
    print(f"대상: {len(docs)}개 문서\n")

    fixed_count = 0
    skip_count = 0

    for doc in docs:
        data = doc.to_dict()
        title = data.get('title', '')[:30]
        content = data.get('content', '')

        fixed_content, changed, reason = fix_article_content(content)

        if changed:
            fixed_count += 1
            print(f"  [수정] {doc.id}  {title}  → {reason}")

            if args.apply:
                db.collection('articles').document(doc.id).update({
                    'content': fixed_content
                })
                print(f"         Firestore 업데이트 완료")
        else:
            skip_count += 1
            print(f"  [건너뜀] {doc.id}  {title}  ({reason})")

    print(f"\n결과: 수정 {fixed_count}개, 건너뜀 {skip_count}개")
    if not args.apply and fixed_count > 0:
        print(f"\n실제 적용하려면: python scripts/fix_articles.py --apply")


if __name__ == '__main__':
    main()
