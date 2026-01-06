"use client"

import { Section } from "@/components/ui/section"
import { motion } from "framer-motion"
import { MapPin, Phone, Globe, Clock, Navigation } from "lucide-react"
import { InteractiveElement } from "@/components/ui/interactive-element"
import { Button } from "@/components/ui/button"

export default function LocationPage() {
    return (
        <div className="pt-20"> {/* Add padding for fixed navbar */}
            <Section className="min-h-screen bg-white">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">오시는 길</h1>
                        <p className="text-lg text-gray-500">
                            밀양의 중심에서 여러분의 척추 건강을 지킵니다.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Map Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full aspect-[4/3] relative rounded-2xl overflow-hidden shadow-lg border border-gray-100"
                        >
                            <iframe
                                src="https://maps.google.com/maps?q=경남%20밀양시%20중앙로%20451&t=m&z=17&output=embed&iwloc=near"
                                className="w-full h-full border-0"
                                loading="lazy"
                                aria-label="Google Map"
                            />
                            <div className="absolute bottom-4 right-4">
                                <Button variant="secondary" size="sm" className="bg-white/90 backdrop-blur shadow-sm text-xs h-8">
                                    <Navigation className="w-3 h-3 mr-1" />
                                    길찾기 (Kakao/Naver)
                                </Button>
                            </div>
                        </motion.div>

                        {/* Info Section */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="space-y-10"
                        >
                            <div className="space-y-8">
                                <InteractiveElement href="https://map.naver.com" className="group">
                                    <div className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50">
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">주소</h3>
                                            <p className="text-gray-600 leading-relaxed">
                                                경상남도 밀양시 중앙로 451번지
                                            </p>
                                        </div>
                                    </div>
                                </InteractiveElement>

                                <InteractiveElement href="tel:055-356-5500" className="group">
                                    <div className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-black transition-colors">
                                            <Phone className="w-5 h-5 text-black group-hover:text-white transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">전화번호</h3>
                                            <p className="text-xl font-medium text-gray-900">055-356-5500</p>
                                            <p className="text-sm text-gray-500 mt-1">평일 08:30 - 17:30 상담 가능</p>
                                        </div>
                                    </div>
                                </InteractiveElement>

                                <InteractiveElement href="https://miryangos.com" className="group">
                                    <div className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-gray-50">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-black transition-colors">
                                            <Globe className="w-5 h-5 text-black group-hover:text-white transition-colors" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">웹사이트</h3>
                                            <p className="text-gray-600">www.miryangos.com</p>
                                        </div>
                                    </div>
                                </InteractiveElement>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex items-start gap-3 mb-4">
                                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <h4 className="font-medium">진료 시간 안내</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                    <div>
                                        <p className="font-medium text-gray-900 mb-1">평일</p>
                                        <p>08:30 - 17:30</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 mb-1">토요일</p>
                                        <p>08:30 - 12:30</p>
                                        <p className="text-xs text-red-500 mt-0.5">첫째, 셋째 주 휴무</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 mb-1">점심시간</p>
                                        <p>12:30 - 13:30</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-red-500 mb-1">휴진</p>
                                        <p className="text-red-500">일요일, 공휴일</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </Section>
        </div>
    )
}
