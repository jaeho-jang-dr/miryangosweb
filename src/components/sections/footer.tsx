import Link from "next/link"

export function Footer() {
    return (
        <footer className="bg-apple-gray py-12 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="text-xl font-bold tracking-tight">
                            miryang<span className="font-extrabold">os</span>
                        </Link>
                        <p className="mt-4 text-sm text-gray-500 max-w-sm">
                            밀양정형외과는 환자 중심의 진료와 최신 의료 기술을 통해 지역 사회의 건강을 책임집니다.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                            진료 안내
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>척추 클리닉</li>
                            <li>관절 클리닉</li>
                            <li>통증 클리닉</li>
                            <li>물리치료 센터</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                            Contact
                        </h3>
                        <ul className="space-y-3 text-sm text-gray-600">
                            <li>경남 밀양시 중앙로 123 (가상 주소)</li>
                            <li>055-123-4567</li>
                            <li>contact@miryangos.com</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} Miryang Orthopedic Surgery. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
