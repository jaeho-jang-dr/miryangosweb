export type Language = 'ko' | 'en';

export const translations = {
    ko: {
        navbar: {
            logoText: "밀양정형외과",
            logoSuffix: "", // Korean logo handles "os" differently or integrated
            menu: {
                intro: "소개",
                departments: "진료분야",
                archive: "아카이브",
                location: "오시는 길",
                reservation: "예약 / 로그인",
            },
            mobileMenuOpen: "메뉴 열기",
        },
        hero: {
            badge: "Miryang Orthopedic Surgery",
            title: "척추, 그 올바른 균형을 위하여",
            subtitle: "대학병원 교수 출신 전문의의 30년 원칙.\n환자분의 든든한 디지털 척추가 되어드리겠습니다.",
            buttons: {
                diseases: "질병 알아보기",
                hours: "진료 시간 확인",
            },
            hoursModal: {
                title: "진료 안내",
                hoursTitle: "진료 시간",
                weekdays: "평일",
                saturday: "토요일",
                lunch: "점심시간",
                closed: "* 일요일, 공휴일, 첫째/셋째 주 토요일 휴진",
                phoneTitle: "문의 전화",
                locationTitle: "오시는 길",
                address: "경남 밀양시 중앙로 451번지",
                confirm: "확인",
            }
        },
        philosophy: {
            title: "모든 척추는 올곧아야 합니다.",
            description: "15년 전, 밀양에 내려오며 다짐했습니다.\n과잉 진료 없는 정직한 치료, 대학병원 수준의 전문성으로\n지역 주민들의 건강한 척추를 지켜드리겠다고.\n\n이제 디지털 기술을 더해 여러분의 건강 데이터를 체계적으로 관리하고,\n언제 어디서든 소통할 수 있는 '디지털 척추(Digital Spine)'를 구축합니다.",
            cards: {
                years: {
                    number: "15+",
                    label: "Years in Miryang",
                    desc: "지역 사회와 함께한\n신뢰의 시간",
                },
                expert: {
                    title: "Expert",
                    label: "Board Certified",
                    desc: "척추외과 전문의\n대학병원 교수 출신",
                },
                ai: {
                    title: "AI & Data",
                    label: "Digital Transformation",
                    desc: "데이터 기반의\n스마트한 진료",
                },
            },
        },
        footer: {
            description: "밀양정형외과는 환자 중심의 진료와 최신 의료 기술을 통해 지역 사회의 건강을 책임집니다.",
            sections: {
                clinic: "진료 안내",
                items: ["척추 클리닉", "관절 클리닉", "통증 클리닉", "물리치료 센터"],
                contact: "Contact",
            },
            address: "경남 밀양시 중앙로 451번지",
            copyright: "Miryang Orthopedic Surgery. All rights reserved.",
        },
        departments: {
            title: "전문 진료 분야",
            subtitle: "대학병원 수준의 전문성과 첨단 장비로 정확하게 진단하고 치료합니다.",
            spine: {
                title: "척추 클리닉",
                desc: "허리 디스크, 척추관 협착증 등 척추 질환에 대한 비수술적/수술적 치료"
            },
            joint: {
                title: "관절 클리닉",
                desc: "무릎, 어깨, 고관절 등 퇴행성 관절염 및 스포츠 손상 치료"
            },
            pain: {
                title: "통증 클리닉",
                desc: "급/만성 통증 완화를 위한 신경차단술 및 주사 치료"
            },
            geriatric: {
                title: "노인성 질환",
                desc: "골다공증, 근감소증. 어르신들의 편안한 노후를 위한 관리."
            },
            pt: {
                title: "물리치료 센터",
                desc: "전문 물리치료사의 1:1 맞춤형 도수치료 및 재활 프로그램"
            }
        }
    },
    en: {
        navbar: {
            logoText: "miryang",
            logoSuffix: "os",
            menu: {
                intro: "About",
                departments: "Departments",
                archive: "Archive",
                location: "Location",
                reservation: "Book / Login",
            },
            mobileMenuOpen: "Open Menu",
        },
        hero: {
            badge: "Miryang Orthopedic Surgery",
            title: "Spine, For the Right Balance",
            subtitle: "30 Years of Principles from a University Hospital Professor.\nWe will become your reliable digital spine.",
            buttons: {
                diseases: "Learn More",
                hours: "Check Hours",
            },
            hoursModal: {
                title: "Clinic Information",
                hoursTitle: "Opening Hours",
                weekdays: "Weekdays",
                saturday: "Saturday",
                lunch: "Lunch Break",
                closed: "* Closed on Sundays, Holidays, and 1st/3rd Saturdays",
                phoneTitle: "Contact",
                locationTitle: "Location",
                address: "451 Jungang-ro, Miryang-si, Gyeongnam",
                confirm: "Close",
            }
        },
        philosophy: {
            title: "Every Spine Should Be Upright.",
            description: "15 years ago, when I came to Miryang, I made a promise.\nTo protect the healthy spines of local residents with honest treatment without over-treatment and expertise at the university hospital level.\n\nNow, adding digital technology, we systematically manage your health data and\nbuild a 'Digital Spine' that allows communication anytime, anywhere.",
            cards: {
                years: {
                    number: "15+",
                    label: "Years in Miryang",
                    desc: "Time of Trust\nwith the Community",
                },
                expert: {
                    title: "Expert",
                    label: "Board Certified",
                    desc: "Orthopedic Specialist\nEx-University Professor",
                },
                ai: {
                    title: "AI & Data",
                    label: "Digital Transformation",
                    desc: "Data-Driven\nSmart Care",
                },
            },
        },
        footer: {
            description: "Miryang Orthopedic Surgery is responsible for the health of the community through patient-centered care and the latest medical technology.",
            sections: {
                clinic: "Clinical Services",
                items: ["Spine Clinic", "Joint Clinic", "Pain Clinic", "Physical Therapy"],
                contact: "Contact",
            },
            address: "451 Jungang-ro, Miryang-si, Gyeongnam",
            copyright: "Miryang Orthopedic Surgery. All rights reserved.",
        },
        departments: {
            title: "Departments",
            subtitle: "We diagnose and treat accurately with university hospital-level expertise and advanced equipment.",
            spine: {
                title: "Spine Clinic",
                desc: "Non-surgical/surgical treatment for spinal diseases such as herniated discs and spinal stenosis"
            },
            joint: {
                title: "Joint Clinic",
                desc: "Treatment for degenerative arthritis and sports injuries in knees, shoulders, hips, etc."
            },
            pain: {
                title: "Pain Clinic",
                desc: "Nerve blocks and injection therapy for acute/chronic pain relief"
            },
            geriatric: {
                title: "Geriatric Diseases",
                desc: "Osteoporosis, Sarcopenia. Management for a comfortable old age."
            },
            pt: {
                title: "Physical Therapy",
                desc: "1:1 customized manual therapy and rehabilitation programs by professional physical therapists"
            }
        }
    },
};
