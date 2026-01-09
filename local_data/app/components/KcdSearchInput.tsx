"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  code: string;
  nameKo: string;
  nameEn?: string;
};

export default function KcdSearchInput(props: {
  value?: string;
  onPick?: (item: Item) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const debouncedQ = useDebounce(q, 180);

  useEffect(() => {
    const run = async () => {
      const query = debouncedQ.trim();
      if (!query) {
        setItems([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/kcd/search?q=${encodeURIComponent(query)}&limit=20`);
        const json = await res.json();
        setItems(json.items || []);
        setOpen(true);
      } catch {
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [debouncedQ]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hint = useMemo(() => {
    if (!debouncedQ.trim()) return "상병명(한글) 또는 코드(M48...)를 입력하세요";
    if (loading) return "검색 중...";
    if (!items.length) return "검색 결과 없음";
    return "";
  }, [debouncedQ, loading, items.length]);

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
        placeholder={props.placeholder || "예: 척추관협착증 / 척추협착 / M4806"}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: "1px solid #d0d7de",
          borderRadius: 12,
          outline: "none",
        }}
      />

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            border: "1px solid #d0d7de",
            borderRadius: 14,
            background: "white",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            maxHeight: 320,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {hint ? (
            <div style={{ padding: 12, fontSize: 13, opacity: 0.75 }}>{hint}</div>
          ) : null}

          {items.map((it) => (
            <button
              key={`${it.code}-${it.nameKo}`}
              onClick={() => {
                props.onPick?.(it);
                setQ(it.nameKo);
                setOpen(false);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{it.nameKo}</div>
                <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", opacity: 0.85 }}>
                  {it.code}
                </div>
              </div>
              {it.nameEn ? (
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{it.nameEn}</div>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function useDebounce<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
