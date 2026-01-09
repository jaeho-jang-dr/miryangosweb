import fs from "fs";
import path from "path";
import iconv from "iconv-lite";
import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";

type KcdRow = {
  "상병기호": string;
  "한글명": string;
  "영문명"?: string;
};

let CACHE: KcdRow[] | null = null;

function loadCsvOnce(): KcdRow[] {
  if (CACHE) return CACHE;

  // 프로젝트 루트/local_data 아래에 CSV를 두는 방식
  const csvPath = path.join(
    process.cwd(),
    "local_data",
    "건강보험심사평가원-상병마스터-20250930.csv"
  );

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
  }

  const buf = fs.readFileSync(csvPath);

  // 상병마스터는 CP949(EUC-KR 계열)로 배포되는 경우가 많습니다.
  const text = iconv.decode(buf, "cp949");

  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as KcdRow[];

  CACHE = records
    .filter((r) => r["상병기호"] && r["한글명"])
    .map((r) => ({
      "상병기호": String(r["상병기호"]).trim(),
      "한글명": String(r["한글명"]).trim(),
      "영문명": r["영문명"] ? String(r["영문명"]).trim() : "",
    }));

  return CACHE!;
}

function normalizeQuery(s: string) {
  // 체감 개선용: "척추관협착증" → 파일상 "척추협착" 쪽으로 잘 매칭되게
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/척추관/g, "척추")
    .replace(/관협착/g, "협착")
    .replace(/증$/g, "")
    .toLowerCase();
}

function normalizeName(s: string) {
  return s
    .trim()
    .replace(/\s+/g, "")
    .replace(/증$/g, "")
    .toLowerCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!q) return NextResponse.json({ items: [] });

  let data: KcdRow[];
  try {
    data = loadCsvOnce();
  } catch (e: any) {
    return NextResponse.json(
      { items: [], error: e?.message || "CSV 로드 실패" },
      { status: 500 }
    );
  }

  const nq = normalizeQuery(q);
  const codeQ = q.replace(/\s+/g, "").toUpperCase();

  const items = data
    .filter((r) => {
      const name = normalizeName(r["한글명"]);
      const code = (r["상병기호"] || "").toUpperCase();
      return name.includes(nq) || code.startsWith(codeQ);
    })
    .slice(0, limit)
    .map((r) => ({
      code: r["상병기호"],
      nameKo: r["한글명"],
      nameEn: r["영문명"] || "",
    }));

  return NextResponse.json({ items });
}
