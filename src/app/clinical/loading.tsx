export default function ClinicalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-24 h-24 mx-auto">
          {/* Medical cross loader */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16">
              <svg
                className="w-full h-full text-blue-600 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z" />
              </svg>
            </div>
          </div>
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin"></div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-700">
            진료 시스템 로딩 중...
          </p>
          <p className="text-sm text-gray-500">환자 정보를 불러오고 있습니다</p>
        </div>
      </div>
    </div>
  );
}
