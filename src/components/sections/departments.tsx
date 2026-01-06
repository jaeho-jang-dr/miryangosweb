"use client"

import { Section } from "@/components/ui/section"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Layers, CircleDot, Syringe, Accessibility, Hand } from "lucide-react"
import { InteractiveElement } from "@/components/ui/interactive-element"

import { useLanguage } from "@/lib/language-context"

export function Departments() {
    const { t } = useLanguage()

    const departments = [
        {
            title: t.departments.spine.title,
            icon: Layers,
            desc: t.departments.spine.desc,
            id: "spine"
        },
        {
            title: t.departments.joint.title,
            icon: CircleDot,
            desc: t.departments.joint.desc,
            id: "joint"
        },
        {
            title: t.departments.pain.title,
            icon: Syringe,
            desc: t.departments.pain.desc,
            id: "pain"
        },
        {
            title: t.departments.geriatric.title,
            icon: Accessibility,
            desc: t.departments.geriatric.desc,
            id: "geriatric"
        },
        {
            title: t.departments.pt.title,
            icon: Hand,
            desc: t.departments.pt.desc,
            id: "pt"
        },
    ]


    return (
        <Section id="departments" className="bg-white">
            <div className="text-center mb-16 flex flex-col items-center">
                <InteractiveElement href="/departments">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                        {t.departments.title}
                    </h2>
                </InteractiveElement>
                <InteractiveElement href="/departments">
                    <p className="text-lg text-gray-500">
                        {t.departments.subtitle}
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
        </Section >
    )
}
