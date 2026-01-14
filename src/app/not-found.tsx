import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <h2 className="text-3xl font-bold text-gray-900">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="default">홈으로 이동</Button>
          </Link>
          <Link href="/location">
            <Button variant="outline">오시는 길</Button>
          </Link>
        </div>

        <div className="pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            문제가 계속되면{' '}
            <Link href="/inquiry" className="text-blue-600 hover:underline">
              문의하기
            </Link>
            를 이용해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
