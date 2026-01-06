"use client"

import { Section } from "@/components/ui/section"
import { motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"

export function Philosophy() {
    return (
        <Section className="bg-apple-gray">
            <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <InteractiveElement href="/philosophy/core" className="mb-6">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            모든 척추는 올곧아야 합니다.
                        </h2>
                    </InteractiveElement>

                    <InteractiveElement href="/philosophy/story" className="mb-12">
                        <p className="text-lg text-gray-600 leading-relaxed">
                            14년 전, 밀양에 내려오며 다짐했습니다.<br />
                            과잉 진료 없는 정직한 치료, 대학병원 수준의 전문성으로<br />
                            지역 주민들의 건강한 척추를 지켜드리겠다고.<br /><br />
                            이제 디지털 기술을 더해 여러분의 건강 데이터를 체계적으로 관리하고,<br />
                            언제 어디서든 소통할 수 있는 <b>'디지털 척추(Digital Spine)'</b>를 구축합니다.
                        </p>
                    </InteractiveElement>
                </motion.div>

                <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <InteractiveElement href="/history" className="h-full">
                            <div className="p-6 bg-white rounded-2xl shadow-sm h-full">
                                <div className="text-3xl font-bold text-black mb-2">14+</div>
                                <div className="text-sm text-gray-500">Years in Miryang</div>
                                <div className="mt-2 text-sm text-gray-700">지역 사회와 함께한<br />신뢰의 시간</div>
                            </div>
                        </InteractiveElement>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                    >
                        <InteractiveElement href="/doctor" className="h-full">
                            <div className="p-6 bg-white rounded-2xl shadow-sm h-full">
                                <div className="text-3xl font-bold text-black mb-2">Expert</div>
                                <div className="text-sm text-gray-500">Board Certified</div>
                                <div className="mt-2 text-sm text-gray-700">척추외과 전문의<br />대학병원 교수 출신</div>
                            </div>
                        </InteractiveElement>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        <InteractiveElement href="/digital-spine" className="h-full">
                            <div className="p-6 bg-white rounded-2xl shadow-sm h-full">
                                <div className="text-3xl font-bold text-black mb-2">AI & Data</div>
                                <div className="text-sm text-gray-500">Digital Transformation</div>
                                <div className="mt-2 text-sm text-gray-700">데이터 기반의<br />스마트한 진료</div>
                            </div>
                        </InteractiveElement>
                    </motion.div>
                </div>
            </div>
        </Section>
    )
}
