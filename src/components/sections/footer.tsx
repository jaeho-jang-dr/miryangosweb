"use client"

import Link from "next/link"

import { useLanguage } from "@/lib/language-context"

export function Footer() {
    const { t } = useLanguage()
    return (
        <footer className="bg-apple-gray py-12 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="text-xl font-bold tracking-tight">
                            miryang<span className="font-extrabold">os</span>
                        </Link>
                        <p className="mt-4 text-sm text-gray-500 max-w-sm">
                            {t.footer.description}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                            {t.footer.sections.clinic}
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            {t.footer.sections.items.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                            {t.footer.sections.contact}
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>{t.footer.address}</li>
                            <li>055-356-5500</li>
                            <li>contact@miryangos.com</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} {t.footer.copyright}
                    </p>
                </div>
            </div>
        </footer>
    )
}
