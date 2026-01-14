export default function AdminLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          {/* Admin shield loader */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-purple-600 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
          </div>
          <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-spin" style={{ borderTopColor: 'transparent' }}></div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-700">
            관리자 페이지 로딩 중...
          </p>
          <p className="text-sm text-gray-500">데이터를 불러오고 있습니다</p>
        </div>
      </div>
    </div>
  );
}
