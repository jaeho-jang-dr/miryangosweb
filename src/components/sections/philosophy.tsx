"use client"

import { Section } from "@/components/ui/section"
import { motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"
import { useLanguage } from "@/lib/language-context"

export function Philosophy() {
    const { t } = useLanguage()
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
                            {t.philosophy.title}
                        </h2>
                    </InteractiveElement>

                    <InteractiveElement href="/philosophy/story" className="mb-12">
                        <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                            {t.philosophy.description}
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
                                <div className="text-3xl font-bold text-black mb-2">{t.philosophy.cards.years.number}</div>
                                <div className="text-sm text-gray-500">{t.philosophy.cards.years.label}</div>
                                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{t.philosophy.cards.years.desc}</div>
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
                                <div className="text-3xl font-bold text-black mb-2">{t.philosophy.cards.expert.title}</div>
                                <div className="text-sm text-gray-500">{t.philosophy.cards.expert.label}</div>
                                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{t.philosophy.cards.expert.desc}</div>
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
                                <div className="text-3xl font-bold text-black mb-2">{t.philosophy.cards.ai.title}</div>
                                <div className="text-sm text-gray-500">{t.philosophy.cards.ai.label}</div>
                                <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">{t.philosophy.cards.ai.desc}</div>
                            </div>
                        </InteractiveElement>
                    </motion.div>
                </div>
            </div>
        </Section>
    )
}
