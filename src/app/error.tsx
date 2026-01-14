'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 에러 로깅 (선택적으로 외부 서비스로 전송)
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <Card className="max-w-md w-full p-8 space-y-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            문제가 발생했습니다
          </h1>
          <p className="text-gray-600">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <p className="text-sm font-mono text-gray-700 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            다시 시도
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
          >
            홈으로 이동
          </Button>
        </div>
      </Card>
    </div>
  );
}
