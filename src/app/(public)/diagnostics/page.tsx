'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface DiagnosticResult {
    name: string;
    status: 'success' | 'error' | 'warning';
    message: string;
    detail?: string;
}

export default function DiagnosticsPage() {
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const diagnostics: DiagnosticResult[] = [];

        // 1. Check Environment Variables
        const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        const naverClientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

        diagnostics.push({
            name: 'Site URL 설정',
            status: siteUrl ? 'success' : 'error',
            message: siteUrl || '설정되지 않음',
            detail: siteUrl ? '✅ 올바르게 설정됨' : '❌ .env.local에 NEXT_PUBLIC_SITE_URL을 설정하세요'
        });

        diagnostics.push({
            name: 'Kakao JavaScript Key',
            status: kakaoKey ? 'success' : 'error',
            message: kakaoKey ? `설정됨 (${kakaoKey.substring(0, 10)}...)` : '설정되지 않음',
            detail: kakaoKey ? '✅ 키가 존재합니다' : '❌ .env.local에 NEXT_PUBLIC_KAKAO_JS_KEY를 설정하세요'
        });

        diagnostics.push({
            name: 'Naver Client ID',
            status: naverClientId ? 'success' : 'error',
            message: naverClientId ? `설정됨 (${naverClientId.substring(0, 10)}...)` : '설정되지 않음',
            detail: naverClientId ? '✅ Client ID가 존재합니다' : '❌ .env.local에 NEXT_PUBLIC_NAVER_CLIENT_ID를 설정하세요'
        });

        // 2. Check if port is correct
        const currentPort = window.location.port;
        diagnostics.push({
            name: '현재 포트',
            status: currentPort === '3001' ? 'success' : 'warning',
            message: `${window.location.port || '기본(80)'}`,
            detail: currentPort === '3001'
                ? '✅ 권장 포트 3001을 사용 중입니다'
                : `⚠️ 포트 3001을 사용하는 것이 권장됩니다. 현재 Kakao/Naver 콘솔에 이 포트(${currentPort || '80'})가 등록되어 있는지 확인하세요.`
        });

        // 3. Check Kakao SDK load
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                const kakaoSdkLoaded = !!(window as any).Kakao;
                diagnostics.push({
                    name: 'Kakao SDK 로드',
                    status: kakaoSdkLoaded ? 'success' : 'error',
                    message: kakaoSdkLoaded ? '로드됨' : '로드 실패',
                    detail: kakaoSdkLoaded
                        ? `✅ Kakao SDK가 정상적으로 로드되었습니다. 초기화 상태: ${(window as any).Kakao?.isInitialized ? 'O' : 'X'}`
                        : '❌ Kakao SDK가 로드되지 않았습니다. CSP 설정을 확인하세요.'
                });

                const naverSdkLoaded = !!(window as any).naver;
                diagnostics.push({
                    name: 'Naver SDK 로드',
                    status: naverSdkLoaded ? 'success' : 'error',
                    message: naverSdkLoaded ? '로드됨' : '로드 실패',
                    detail: naverSdkLoaded
                        ? '✅ Naver SDK가 정상적으로 로드되었습니다.'
                        : '❌ Naver SDK가 로드되지 않았습니다. CSP 설정을 확인하세요.'
                });

                setResults([...diagnostics]);
                setLoading(false);
            }, 2000); // Wait 2 seconds for SDKs to load
        }
    }, []);

    const getIcon = (status: DiagnosticResult['status']) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="w-6 h-6 text-green-500" />;
            case 'error':
                return <XCircle className="w-6 h-6 text-red-500" />;
            case 'warning':
                return <AlertCircle className="w-6 h-6 text-yellow-500" />;
        }
    };

    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        🔍 소셜 로그인 진단
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Kakao 및 Naver 로그인 설정 상태를 확인합니다.
                    </p>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">진단 중...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">진단 결과</h2>
                                        <p className="text-gray-600 mt-1">
                                            {errorCount === 0 && warningCount === 0
                                                ? '✅ 모든 설정이 올바릅니다!'
                                                : `${errorCount}개 오류, ${warningCount}개 경고`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-gray-800">
                                            {results.filter(r => r.status === 'success').length}/{results.length}
                                        </div>
                                        <div className="text-sm text-gray-600">통과</div>
                                    </div>
                                </div>
                            </div>

                            {/* Results */}
                            <div className="space-y-4">
                                {results.map((result, index) => (
                                    <div
                                        key={index}
                                        className="p-5 rounded-xl border-2 transition-all hover:shadow-md"
                                        style={{
                                            borderColor: result.status === 'success' ? '#10b981' : result.status === 'error' ? '#ef4444' : '#f59e0b',
                                            backgroundColor: result.status === 'success' ? '#f0fdf4' : result.status === 'error' ? '#fef2f2' : '#fffbeb'
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getIcon(result.status)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-800 mb-1">
                                                    {result.name}
                                                </h3>
                                                <p className="text-sm text-gray-700 mb-2">
                                                    {result.message}
                                                </p>
                                                {result.detail && (
                                                    <p className="text-xs text-gray-600 bg-white/50 p-2 rounded">
                                                        {result.detail}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Recommendations */}
                            {(errorCount > 0 || warningCount > 0) && (
                                <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5" />
                                        권장 사항
                                    </h3>
                                    <ul className="space-y-2 text-sm text-yellow-900">
                                        {errorCount > 0 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                <span>프로젝트 루트의 <code className="bg-yellow-100 px-1 rounded">.env.local</code> 파일을 확인하세요.</span>
                                            </li>
                                        )}
                                        {errorCount > 0 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                <span>환경 변수 수정 후 개발 서버를 재시작하세요: <code className="bg-yellow-100 px-1 rounded">npx next dev -p 3001</code></span>
                                            </li>
                                        )}
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-500">•</span>
                                            <span>자세한 설정 가이드: <code className="bg-yellow-100 px-1 rounded">SOCIAL_LOGIN_TROUBLESHOOTING.md</code> 참고</span>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-8 flex gap-4">
                                <a
                                    href="/"
                                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all text-center shadow-lg"
                                >
                                    홈으로 돌아가기
                                </a>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all shadow-lg"
                                >
                                    다시 진단하기
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Links */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    <p>문제가 계속되면 브라우저 콘솔(F12)을 확인하거나</p>
                    <p className="mt-1">
                        <a href="https://developers.kakao.com/console" target="_blank" className="text-blue-600 hover:underline">Kakao Developers</a>
                        {' · '}
                        <a href="https://developers.naver.com/apps" target="_blank" className="text-green-600 hover:underline">Naver Developers</a>
                        {' 콘솔에서 설정을 확인하세요.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
