'use client';

import { useState, useEffect } from 'react';
import { Download, Search, Copy, Check, Palette, ChevronDown, ChevronUp } from 'lucide-react';

interface DesignStyle {
  id: number;
  name: string;
  category: string;
  colors: { bg: string; text: string; accent: string };
  font: string;
  prompt: string;
}

interface PromptsData {
  title: string;
  total: number;
  categories: Record<string, number>;
  styles: DesignStyle[];
}

export default function DesignPromptsPage() {
  const [data, setData] = useState<PromptsData | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/data/design-prompts-100.json')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const handleCopy = async (prompt: string, id: number) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = '/data/design-prompts-100.json';
    a.download = 'notebooklm-design-prompts-100.json';
    a.click();
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const categories = ['전체', ...Object.keys(data.categories)];
  const filtered = data.styles.filter(s => {
    const matchCat = selectedCategory === '전체' || s.category === selectedCategory;
    const matchSearch = !search || s.name.includes(search) || s.category.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500" />
                NotebookLM 디자인 프롬프트 100선
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                슬라이드 생성 시 사용할 수 있는 {data.total}가지 디자인 스타일
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              JSON 다운로드
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="스타일 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
                {cat !== '전체' && (
                  <span className="ml-1 opacity-60">{data.categories[cat]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-xs text-slate-400 mb-4">{filtered.length}개 스타일</p>

        <div className="grid gap-3">
          {filtered.map(style => {
            const isExpanded = expandedId === style.id;
            return (
              <div
                key={style.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : style.id)}
                >
                  {/* Color preview */}
                  <div className="flex gap-1 shrink-0">
                    <div
                      className="w-6 h-6 rounded-md border border-slate-200"
                      style={{ backgroundColor: style.colors.bg }}
                      title={`배경: ${style.colors.bg}`}
                    />
                    <div
                      className="w-6 h-6 rounded-md border border-slate-200"
                      style={{ backgroundColor: style.colors.text }}
                      title={`텍스트: ${style.colors.text}`}
                    />
                    <div
                      className="w-6 h-6 rounded-md border border-slate-200"
                      style={{ backgroundColor: style.colors.accent }}
                      title={`강조: ${style.colors.accent}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">#{style.id}</span>
                      <span className="font-medium text-slate-900 text-sm">{style.name}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                        {style.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {style.font}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleCopy(style.prompt, style.id); }}
                      className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                      title="프롬프트 복사"
                    >
                      {copiedId === style.id
                        ? <Check className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4 text-slate-400" />
                      }
                    </button>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-slate-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                </div>

                {/* Expanded prompt */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-500">프롬프트 미리보기</span>
                      <button
                        onClick={() => handleCopy(style.prompt, style.id)}
                        className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                      >
                        {copiedId === style.id ? '복사됨!' : '복사하기'}
                      </button>
                    </div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
                      {style.prompt}
                    </pre>

                    {/* Color preview large */}
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1 rounded-lg overflow-hidden h-12 border" style={{ backgroundColor: style.colors.bg }}>
                        <div className="h-full flex items-center justify-center text-xs font-mono" style={{ color: style.colors.text }}>
                          배경 + 텍스트
                        </div>
                      </div>
                      <div className="w-20 rounded-lg h-12 border flex items-center justify-center" style={{ backgroundColor: style.colors.accent }}>
                        <span className="text-xs font-mono text-white mix-blend-difference">강조</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
