"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"
import { Modal } from "@/components/ui/modal"
import { Clock, MapPin, Phone } from "lucide-react"

export function Hero() {
    const [isHoursOpen, setIsHoursOpen] = React.useState(false)

    return (
        <div className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden bg-white">
            {/* Background Image Placeholder - using a subtle gradient or placeholder for now until images are uploaded */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0" />
            {/* 
         TODO: Replace with actual image when available
         <Image src="/path/to/hero.jpg" alt="Hero" fill className="object-cover opacity-90" />
      */}

            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center sm:px-6 lg:px-8 flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <InteractiveElement href="/intro">
                        <span className="inline-block py-1 px-3 rounded-full bg-black/5 text-gray-600 text-sm font-medium mb-6">
                            Miryang Orthopedic Surgery
                        </span>
                    </InteractiveElement>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="mb-6"
                >
                    <InteractiveElement href="#philosophy">
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                            척추, 그 올바른<br className="hidden sm:block" /> 균형을 위하여
                        </h1>
                    </InteractiveElement>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="mb-10 max-w-2xl mx-auto"
                >
                    <InteractiveElement href="/intro/doctor">
                        <p className="text-lg sm:text-xl md:text-2xl text-gray-500 leading-relaxed font-light">
                            대학병원 교수 출신 전문의의 14년 원칙.<br />
                            환자분의 든든한 디지털 척추가 되어드리겠습니다.
                        </p>
                    </InteractiveElement>
                </motion.div>

                <motion.div
                    className="flex gap-4 flex-col sm:flex-row"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    <InteractiveElement href="/diseases">
                        <Button size="lg" className="h-12 px-8 text-base">
                            질병 알아보기
                        </Button>
                    </InteractiveElement>
                    <InteractiveElement>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base"
                            onClick={() => setIsHoursOpen(true)}
                        >
                            진료 시간 확인
                        </Button>
                    </InteractiveElement>
                </motion.div>
            </div>

            <Modal
                isOpen={isHoursOpen}
                onClose={() => setIsHoursOpen(false)}
                title="진료 안내"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">진료 시간</h3>
                                <div className="mt-1 text-sm text-gray-600 space-y-1">
                                    <p className="flex justify-between w-48"><span>평일</span> <span>08:30 - 17:30</span></p>
                                    <p className="flex justify-between w-48"><span>토요일</span> <span>08:30 - 12:30</span></p>
                                    <p className="flex justify-between w-48 text-gray-400"><span>점심시간</span> <span>12:30 - 13:30</span></p>
                                    <p className="text-red-500 text-xs mt-2">* 일요일, 공휴일, 첫째/셋째 주 토요일 휴진</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">문의 전화</h3>
                                <p className="mt-1 text-sm text-gray-600">055-356-5500</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">오시는 길</h3>
                                <p className="mt-1 text-sm text-gray-600">경남 밀양시 중앙로 451번지</p>
                            </div>
                        </div>        </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <Button onClick={() => setIsHoursOpen(false)}>확인</Button>
                </div>
        </div>
            </Modal >
        </div >
    )
}
