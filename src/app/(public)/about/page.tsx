
'use client';

import { MapPin, Phone, Clock, Award, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="bg-slate-50 dark:bg-slate-900 py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                        병원 소개
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        환자 중심의 진료 철학과 첨단 의료 시스템으로<br />
                        여러분의 건강한 삶을 지켜드립니다.
                    </p>
                </div>
            </section>

            {/* Philosophy Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12">
                        <div className="text-center space-y-4">
                            <div className="inline-flex p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-4">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">환자 중심</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                모든 진료 과정에서 환자의 편안함과<br />안전을 최우선으로 생각합니다.
                            </p>
                        </div>
                        <div className="text-center space-y-4 group">
                            <Link href="/staff/profile" className="block p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:bg-slate-800 dark:hover:border-slate-700 cursor-pointer">
                                <div className="inline-flex p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                    <Award className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">전문성</h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    풍부한 임상 경험을 가진 전문 의료진이<br />최상의 의료 서비스를 제공합니다.
                                </p>
                            </Link>
                        </div>
                        <div className="text-center space-y-4">
                            <div className="inline-flex p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-4">
                                <Shield className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">신뢰</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                과잉 진료 없는 정직한 진료로<br />환자분들의 신뢰에 보답합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Location & Info Section */}
            <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-lg">
                            <iframe
                                src="https://maps.google.com/maps?q=경남%20밀양시%20중앙로%20451&t=m&z=17&output=embed&iwloc=near"
                                className="w-full h-full border-0"
                                loading="lazy"
                                aria-label="Google Map"
                            />
                        </div>
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">오시는 길</h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                                    밀양정형외과는 시외버스주차장 인근에 있으며, 밀양 5일장 근처에 위치 하여 내원하시기에 편리 합니다
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <MapPin className="w-6 h-6 text-blue-600 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">주소</h4>
                                            <p className="text-slate-600 dark:text-slate-400">경상남도 밀양시 중앙로 451</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Phone className="w-6 h-6 text-blue-600 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">연락처</h4>
                                            <p className="text-slate-600 dark:text-slate-400">055-356-5500</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Clock className="w-6 h-6 text-blue-600 mt-1" />
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">진료 시간</h4>
                                            <p className="text-slate-600 dark:text-slate-400">평일 09:00 - 18:00</p>
                                            <p className="text-slate-600 dark:text-slate-400">토요일 09:00 - 13:00</p>
                                            <p className="text-red-500">일요일/공휴일 휴진</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
