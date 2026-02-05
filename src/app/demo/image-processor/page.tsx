import ImageProcessor from '@/components/ImageProcessor';

export default function ImageProcessorDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            이미지 처리 데모
          </h1>
          <p className="text-gray-600">
            GraphicsMagick을 사용한 이미지 리사이즈, 압축, 포맷 변환
          </p>
        </div>

        <ImageProcessor />

        <div className="mt-12 max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">기능 소개</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">✨ 리사이즈</h3>
              <p className="text-sm text-gray-600">
                이미지를 원하는 크기로 조정할 수 있습니다.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">🎨 품질 조정</h3>
              <p className="text-sm text-gray-600">
                이미지 품질을 조정하여 파일 크기를 최적화합니다.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold mb-2">🔄 포맷 변환</h3>
              <p className="text-sm text-gray-600">
                JPG, PNG, WebP, GIF 등 다양한 포맷으로 변환 가능합니다.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">⚡ 고속 처리</h3>
              <p className="text-sm text-gray-600">
                GraphicsMagick의 강력한 성능으로 빠른 처리가 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
