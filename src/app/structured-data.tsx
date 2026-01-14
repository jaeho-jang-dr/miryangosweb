/**
 * Structured Data (JSON-LD) for SEO
 * @see https://schema.org/MedicalClinic
 */
export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "name": "밀양 정형외과",
    "alternateName": "Miryang Orthopedic Surgery",
    "description": "밀양시 최고의 정형외과 진료 서비스. 척추, 관절, 스포츠 손상 전문 진료.",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "telephone": "+82-10-XXXX-XXXX", // 실제 전화번호로 교체
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "밀양시 XX동 XXX-X", // 실제 주소로 교체
      "addressLocality": "밀양시",
      "addressRegion": "경상남도",
      "postalCode": "50400", // 실제 우편번호로 교체
      "addressCountry": "KR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "35.5048", // 실제 위도로 교체
      "longitude": "128.7463" // 실제 경도로 교체
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "09:00",
        "closes": "13:00"
      }
    ],
    "medicalSpecialty": [
      "Orthopedic Surgery",
      "Sports Medicine",
      "Spine Surgery"
    ],
    "priceRange": "₩₩₩",
    "image": `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/images/og-image.jpg`
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
