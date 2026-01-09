"use client";

import React, { useMemo, useState } from "react";
import KcdSearchInput from "./components/KcdSearchInput";

type Item = { code: string; nameKo: string; nameEn?: string };

export default function Page() {
  const [assessment, setAssessment] = useState<string>("");
  const [picked, setPicked] = useState<Item | null>(null);

  const insertLine = (it: Item) => {
    const line = `${it.code} / ${it.nameKo}`;
    setAssessment((prev) => {
      const trimmed = prev.trimEnd();
      // 같은 줄 중복 삽입 방지(원하면 삭제해도 됨)
      if (trimmed.split(/\r?\n/).some((l) => l.trim() === line)) return prev;
      return (trimmed ? trimmed + "\n" : "") + line + "\n";
    });
  };

  const countLines = useMemo(() => {
    const lines = assessment.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    return lines.length;
  }, [assessment]);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f8" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <h1 style={{ margin: "8px 0 16px" }}>KCD-8 상병 검색 미니앱</h1>

        <div style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 8 }}>
                상병명(한글) 또는 코드 입력 → 클릭하면 아래 ASSESSMENT에 자동 삽입
              </div>

              <KcdSearchInput
                value={picked?.code || ""}
                onPick={(it) => {
                  setPicked(it);
                  insertLine(it);
                }}
              />

              {picked ? (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
                  마지막 선택: <b>{picked.code}</b> — {picked.nameKo}
                </div>
              ) : null}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>ASSESSMENT (진단)</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{countLines} lines</div>
              </div>

              <textarea
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder={"예)\nM4806 / 척추협착, 요추부\nS335 / 요추부 염좌\n"}
                style={{
                  width: "100%",
                  height: 220,
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #d0d7de",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 14,
                  lineHeight: 1.4,
                  resize: "vertical",
                  outline: "none",
                }}
              />

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  onClick={() => setAssessment("")}
                  style={btnStyle}
                >
                  비우기
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(assessment)}
                  style={btnStyle}
                >
                  클립보드 복사
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                ※ CSV는 서버에서 읽습니다. 실행 중에 결과가 안 나오면 CSV 파일명/경로를 확인하세요.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
          API 테스트: <code>/api/kcd/search?q=척추관협착증</code>
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #d0d7de",
  background: "white",
  cursor: "pointer",
};
