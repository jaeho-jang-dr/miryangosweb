"use client"

import { Section } from "@/components/ui/section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Layers, CircleDot, Syringe, Accessibility, Hand } from "lucide-react"
import { InteractiveElement } from "@/components/ui/interactive-element"

const departments = [
    {
        title: "척추 클리닉",
        icon: Layers, // Represents vertebrae segments
        desc: "허리디스크, 목디스크, 척추관협착증. 물리치료 약물치료 주사치료 및 선택신경 차단술.",
        id: "spine"
    },
    {
        title: "관절 클리닉",
        icon: CircleDot, // Represents a joint socket
        desc: "무릎, 어깨, 고관절 통증. 물리치료, 연골주사, 관절주사 및 DNA(PN) 주사",
        id: "joint"
    },
    {
        title: "통증 클리닉",
        icon: Syringe,
        desc: "만성 통증, 신경 통증. 주사 치료 및 신경 차단술.",
        id: "pain"
    },
    {
        title: "노인성 질환",
        icon: Accessibility, // Represents elderly/care
        desc: "골다공증, 근감소증. 어르신들의 편안한 노후를 위한 관리.",
        id: "geriatric"
    },
    {
        title: "물리치료/도수치료",
        icon: Hand,
        desc: "숙련된 치료사의 1:1 맞춤 도수치료 및 재활 프로그램.",
        id: "pt"
    },
]

export function Departments() {
    return (
        <Section id="departments" className="bg-white">
            <div className="text-center mb-16 flex flex-col items-center">
                <InteractiveElement href="/departments">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                        전문 진료 분야
                    </h2>
                </InteractiveElement>
                <InteractiveElement href="/departments">
                    <p className="text-lg text-gray-500">
                        대학병원에서의 경험과 전문적인 지식으로 정확하게 진단하고 치료합니다.
                    </p>
                </InteractiveElement>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept, index) => (
                    <motion.div
                        key={dept.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <InteractiveElement href={`/departments/${dept.id}`} className="h-full">
                            <Card className="h-full border-none shadow-lg hover:shadow-xl transition-shadow bg-gray-50/50">
                                <CardHeader>
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
                                        <dept.icon className="w-6 h-6 text-black" />
                                    </div>
                                    <CardTitle className="text-xl mb-2">{dept.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-gray-600 leading-relaxed">
                                        {dept.desc}
                                    </p>
                                </CardContent>
                            </Card>
                        </InteractiveElement>
                    </motion.div>
                ))}
            </div>
        </Section>
    )
}
