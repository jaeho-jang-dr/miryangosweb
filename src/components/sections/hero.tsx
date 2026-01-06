"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { InteractiveElement } from "@/components/ui/interactive-element"
import { Modal } from "@/components/ui/modal"
import { Clock, MapPin, Phone } from "lucide-react"
import { DynamicBackground } from "@/components/ui/dynamic-background"
import { useLanguage } from "@/lib/language-context"

export function Hero() {
    const [isHoursOpen, setIsHoursOpen] = React.useState(false)
    const { t } = useLanguage()

    return (
        <div className="relative h-screen min-h-[800px] flex items-center justify-center overflow-hidden bg-white">
            {/* Background Image Placeholder - using a subtle gradient or placeholder for now until images are uploaded */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 z-0" />
            <DynamicBackground />
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
                            {t.hero.badge}
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
                        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-gray-900 leading-[1.1] whitespace-pre-line">
                            {t.hero.title}
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
                        <p className="text-lg sm:text-xl md:text-2xl text-gray-500 leading-relaxed font-light whitespace-pre-line">
                            {t.hero.subtitle}
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
                            {t.hero.buttons.diseases}
                        </Button>
                    </InteractiveElement>
                    <InteractiveElement>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-12 px-8 text-base"
                            onClick={() => setIsHoursOpen(true)}
                        >
                            {t.hero.buttons.hours}
                        </Button>
                    </InteractiveElement>
                </motion.div>
            </div>

            <Modal
                isOpen={isHoursOpen}
                onClose={() => setIsHoursOpen(false)}
                title={t.hero.hoursModal.title}
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">{t.hero.hoursModal.hoursTitle}</h3>
                                <div className="mt-1 text-sm text-gray-600 space-y-1">
                                    <p className="flex justify-between w-48"><span>{t.hero.hoursModal.weekdays}</span> <span>08:30 - 17:30</span></p>
                                    <p className="flex justify-between w-48"><span>{t.hero.hoursModal.saturday}</span> <span>08:30 - 12:30</span></p>
                                    <p className="flex justify-between w-48 text-gray-400"><span>{t.hero.hoursModal.lunch}</span> <span>12:30 - 13:30</span></p>
                                    <p className="text-red-500 text-xs mt-2">{t.hero.hoursModal.closed}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">{t.hero.hoursModal.phoneTitle}</h3>
                                <p className="mt-1 text-sm text-gray-600">055-356-5500</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-gray-900">{t.hero.hoursModal.locationTitle}</h3>
                                <p className="mt-1 text-sm text-gray-600">{t.hero.hoursModal.address}</p>
                            </div>
                        </div>        </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                    <Button onClick={() => setIsHoursOpen(false)}>{t.hero.hoursModal.confirm}</Button>
                </div>
            </Modal>
        </div>
    )
}
