'use client';

import Image from 'next/image';
import { Article } from '@/types/public-schemas';
import { ArrowRight, BookOpen, Calendar, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CartoonShowcaseProps {
    cartoons: Article[];
}

export default function CartoonShowcase({ cartoons }: CartoonShowcaseProps) {
    if (!cartoons || cartoons.length === 0) return null;

    return (
        <section className="py-16 md:py-24 bg-gradient-to-b from-white to-slate-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-[-10%] w-[500px] h-[500px] bg-purple-100/30 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                            <Sparkles className="w-3 h-3" />
                            AI Health Education
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            알기 쉬운 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">질병 웹툰</span>
                        </h2>
                        <p className="text-slate-600 max-w-xl text-lg">
                            어렵게만 느껴지는 의학 정보, AI가 그린 만화로 쉽고 재미있게 알아보세요.
                            밀양정형외과가 여러분의 눈높이에서 설명해드립니다.
                        </p>
                    </div>
                    <Link 
                        href="/archives" 
                        className="group flex items-center gap-2 text-slate-600 font-bold hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-blue-50"
                    >
                        전체 보기 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {cartoons.map((cartoon, idx) => (
                        <Link 
                            href={`/archives/${cartoon.id}`} 
                            key={cartoon.id}
                            className="group block h-full"
                        >
                            <article className="h-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col">
                                {/* Image Area */}
                                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                    {cartoon.images && cartoon.images.length > 0 ? (
                                        <Image
                                            src={cartoon.images[0]}
                                            alt={cartoon.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <BookOpen className="w-12 h-12" />
                                        </div>
                                    )}
                                    
                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                        <span className="text-white text-sm font-bold flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" /> 지금 읽기
                                        </span>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                                            질병정보
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {cartoon.createdAt
                                                ? typeof cartoon.createdAt === 'string'
                                                    ? new Date(cartoon.createdAt).toLocaleDateString()
                                                    : cartoon.createdAt instanceof Date
                                                        ? cartoon.createdAt.toLocaleDateString()
                                                        : new Date(cartoon.createdAt.seconds * 1000).toLocaleDateString()
                                                : '최근'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {cartoon.title}
                                    </h3>
                                    
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                        {cartoon.content.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[#*`]/g, '').substring(0, 100)}...
                                    </p>
                                    
                                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-400">
                                        <span>AI Generated</span>
                                        <span className="group-hover:translate-x-1 transition-transform text-blue-500">
                                            자세히 보기 &rarr;
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
