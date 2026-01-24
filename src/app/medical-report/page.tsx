'use client';

import { useState, useRef } from 'react';
import { Printer, FileText, ChevronLeft, PenTool, Calendar, User } from 'lucide-react';

// --- Types ---
type DocType = 'diagnosis' | 'opinion' | 'referral' | 'confirmation';

interface PatientInfo {
    name: string;
    rrn: string; // 주민등록번호
    address: string;
    diagnosis: string;
    kcdCode: string;
    opinion: string;
    period: string;
    visitDates: string;
    hospitalName: string;
    doctorName: string;
    licenseNo: string;
}

export default function MedicalDocumentsPage() {
    const [activeDoc, setActiveDoc] = useState<DocType>('diagnosis');
    const [info, setInfo] = useState<PatientInfo>({
        name: '홍길동',
        rrn: '850101-1xxxxxx',
        address: '경상남도 밀양시 중앙로 123',
        diagnosis: '요추의 염좌 및 긴장',
        kcdCode: 'S33.5',
        opinion: '상기 환자는 요통을 주소로 본원에 내원하였으며, 요추부 압통 및 운동 제한 관찰되어 약물 및 물리치료 시행함. 향후 약 2주간의 안정 가료가 필요할 것으로 사료됨.',
        period: '2024년 1월 20일 ~ 2024년 1월 27일 (8일간)',
        visitDates: '2024.01.20, 2024.01.24, 2024.01.27',
        hospitalName: '밀양 정형외과 의원',
        doctorName: '장 재 호',
        licenseNo: '제 12345 호'
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
            {/* --- 1. Left Sidebar (Controls) : Print hidden --- */}
            <div className="w-96 bg-white border-r border-slate-200 flex flex-col h-full print:hidden shadow-xl z-10">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        제증명 발급 센터
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">서류 양식을 선택하고 내용을 수정하세요.</p>
                </div>

                <div className="p-4 grid grid-cols-2 gap-2">
                    <DocButton
                        label="일반 진단서"
                        isActive={activeDoc === 'diagnosis'}
                        onClick={() => setActiveDoc('diagnosis')}
                    />
                    <DocButton
                        label="진료 소견서"
                        isActive={activeDoc === 'opinion'}
                        onClick={() => setActiveDoc('opinion')}
                    />
                    <DocButton
                        label="진료 의뢰서"
                        isActive={activeDoc === 'referral'}
                        onClick={() => setActiveDoc('referral')}
                    />
                    <DocButton
                        label="통원 확인서"
                        isActive={activeDoc === 'confirmation'}
                        onClick={() => setActiveDoc('confirmation')}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                    <h3 className="text-sm font-bold text-slate-500 uppercase">내용 수정</h3>

                    <InputGroup label="환자 성명">
                        <input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} className="input-field" />
                    </InputGroup>
                    <InputGroup label="주민등록번호">
                        <input type="text" value={info.rrn} onChange={e => setInfo({ ...info, rrn: e.target.value })} className="input-field" />
                    </InputGroup>
                    <InputGroup label="주소">
                        <input type="text" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} className="input-field" />
                    </InputGroup>

                    <hr className="border-slate-200 my-4" />

                    <InputGroup label="진단명 (Clinical Diagnosis)">
                        <input type="text" value={info.diagnosis} onChange={e => setInfo({ ...info, diagnosis: e.target.value })} className="input-field font-bold text-indigo-900" />
                    </InputGroup>
                    <InputGroup label="질병 분류 기호 (KCD)">
                        <input type="text" value={info.kcdCode} onChange={e => setInfo({ ...info, kcdCode: e.target.value })} className="input-field" />
                    </InputGroup>

                    {(activeDoc === 'diagnosis' || activeDoc === 'confirmation') && (
                        <InputGroup label="치료 기간 / 내원일">
                            <input type="text" value={activeDoc === 'confirmation' ? info.visitDates : info.period}
                                onChange={e => activeDoc === 'confirmation' ? setInfo({ ...info, visitDates: e.target.value }) : setInfo({ ...info, period: e.target.value })}
                                className="input-field" />
                        </InputGroup>
                    )}

                    <InputGroup label="향후 치료 의견 / 소견">
                        <textarea rows={5} value={info.opinion} onChange={e => setInfo({ ...info, opinion: e.target.value })} className="input-field resize-none leading-relaxed" />
                    </InputGroup>
                </div>

                <div className="p-4 border-t border-slate-200 bg-white">
                    <button onClick={handlePrint} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all">
                        <Printer className="w-5 h-5" />
                        A4 출력 / PDF 저장
                    </button>
                </div>
            </div>

            {/* --- 2. Main Preview Area (A4 Paper) --- */}
            <div className="flex-1 bg-slate-200 overflow-y-auto p-8 flex justify-center print:p-0 print:bg-white print:overflow-visible">
                <div className="print-content bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[20mm] relative text-slate-900 box-border mx-auto">

                    {/* --- Document Component Switcher --- */}
                    {activeDoc === 'diagnosis' && <DiagnosisForm info={info} />}
                    {activeDoc === 'opinion' && <OpinionForm info={info} />}
                    {activeDoc === 'referral' && <ReferralForm info={info} />}
                    {activeDoc === 'confirmation' && <ConfirmationForm info={info} />}

                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    .print-content { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                        height: 100% !important;
                        padding: 20mm !important;
                    }
                }
                .input-field {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    outline: none;
                }
                .input-field:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
                }
                table.chart-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                table.chart-table th, table.chart-table td {
                    border: 1px solid #000;
                    padding: 8px 10px;
                    font-size: 14px;
                }
                table.chart-table th {
                    background-color: #f8f9fa;
                    text-align: center;
                    font-weight: bold;
                    width: 120px;
                }
            `}</style>
        </div>
    );
}

// --- Helper Components ---

function InputGroup({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
            {children}
        </div>
    );
}

function DocButton({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`py-3 px-2 rounded-lg text-sm font-bold border transition-all ${isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
        >
            {label}
        </button>
    );
}

// =================================================================================================
// 📄 1. 일반 진단서 (Diagnosis Form)
// =================================================================================================
function DiagnosisForm({ info }: { info: PatientInfo }) {
    return (
        <div className="flex flex-col h-full font-serif">
            <h1 className="text-3xl font-extrabold text-center mb-2 underline decoration-4 decoration-slate-900 underline-offset-8">진 &nbsp; 단 &nbsp; 서</h1>
            <p className="text-center text-sm mb-10">(General Medical Certificate)</p>

            <div className="flex justify-between text-sm mb-2">
                <span>병록 번호 : 2024-00123</span>
                <span>연 번 호 : 제 24-058 호</span>
            </div>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th rowSpan={3}>환<br /><br />자</th>
                        <th>성 명</th>
                        <td>{info.name}</td>
                        <th>주민등록번호</th>
                        <td>{info.rrn}</td>
                    </tr>
                    <tr>
                        <th>연 령</th>
                        <td>만 42 세</td>
                        <th>성 별</th>
                        <td>남 / 여</td>
                    </tr>
                    <tr>
                        <th>주 소</th>
                        <td colSpan={3}>{info.address}</td>
                    </tr>
                    <tr>
                        <th rowSpan={2}>병 명</th>
                        <th>임상적 추정</th>
                        <td colSpan={3} className="font-bold">{info.diagnosis}</td>
                    </tr>
                    <tr>
                        <th>임상적 최종</th>
                        <td colSpan={3} className="text-xs text-slate-500">(최종 진단 시 기재)</td>
                    </tr>
                    <tr>
                        <th colSpan={2}>질병분류기호</th>
                        <td colSpan={3} className="font-bold">{info.kcdCode}</td>
                    </tr>
                    <tr>
                        <th colSpan={2}>발 병 일</th>
                        <td colSpan={3}>2024년 1월 15일 (임상적 추정)</td>
                    </tr>
                    <tr>
                        <th colSpan={2}>진단 기준일</th>
                        <td colSpan={3}>2024년 1월 20일</td>
                    </tr>
                    <tr>
                        <th colSpan={2}>향후치료 의견</th>
                        <td colSpan={3} className="h-48 align-top py-4 leading-relaxed whitespace-pre-wrap">
                            {info.opinion}
                        </td>
                    </tr>
                    <tr>
                        <th colSpan={2}>비 고</th>
                        <td colSpan={3} className="h-16 align-top"></td>
                    </tr>
                    <tr>
                        <th colSpan={2}>용 도</th>
                        <td colSpan={3}>보험 제출용</td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-8 text-center">
                <p className="text-lg mb-8">의료법 제 17조의 규정에 의하여 위와 같이 진단함.</p>
                <p className="text-lg font-bold mb-12">2024년 01월 24일</p>

                <div className="ml-auto w-fit text-right pr-10">
                    <p className="text-lg font-bold mb-1">{info.hospitalName}</p>
                    <p className="text-md mb-4">주소: 경상남도 밀양시 중앙로 123</p>
                    <div className="flex items-center gap-4 justify-end">
                        <span className="text-md">면 허 번 호 : {info.licenseNo}</span>
                    </div>
                    <div className="flex items-center gap-4 justify-end mt-2">
                        <span className="text-md font-bold">진 료 의 사 :  {info.doctorName}</span>
                        <div className="relative w-16 h-16 inline-block">
                            <div className="absolute inset-0 border-2 border-red-600 rounded-full flex items-center justify-center text-red-600 font-bold opacity-50 rotate-[-15deg]">
                                인
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =================================================================================================
// 📄 2. 진료 소견서 (Medical Opinion)
// =================================================================================================
function OpinionForm({ info }: { info: PatientInfo }) {
    return (
        <div className="flex flex-col h-full font-serif">
            <h1 className="text-3xl font-extrabold text-center mb-10 underline decoration-4 decoration-slate-900 underline-offset-8">진 료 소 견 서</h1>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th className="bg-slate-100">성 명</th>
                        <td>{info.name}</td>
                        <th className="bg-slate-100">주민등록번호</th>
                        <td>{info.rrn}</td>
                    </tr>
                    <tr>
                        <th className="bg-slate-100">주 소</th>
                        <td colSpan={3}>{info.address}</td>
                    </tr>
                    <tr>
                        <th className="bg-slate-100">진 단 명</th>
                        <td colSpan={3} className="font-bold">{info.diagnosis}</td>
                    </tr>
                    <tr>
                        <th className="bg-slate-100 h-64 align-middle">소 견</th>
                        <td colSpan={3} className="align-top p-6 leading-loose whitespace-pre-wrap text-lg">
                            {info.opinion}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-auto mb-20 text-center">
                <p className="text-lg mb-8">위와 같이 소견합니다.</p>
                <p className="text-lg font-bold mb-10">2024년 01월 24일</p>

                <div className="text-center font-bold text-xl">
                    <p className="mb-2">{info.hospitalName}</p>
                    <p>의사 {info.doctorName} (인)</p>
                </div>
            </div>
        </div>
    );
}

// =================================================================================================
// 📄 3. 진료 의뢰서 (Referral Letter)
// =================================================================================================
// 요양급여의뢰서 표준 양식
function ReferralForm({ info }: { info: PatientInfo }) {
    return (
        <div className="flex flex-col h-full font-serif">
            <div className="border border-black p-1 mb-1 text-[10px] text-right">
                국민건강보험 요양급여의 기준에 관한 규칙 [별지 제4호 서식]
            </div>
            <h1 className="text-2xl font-extrabold text-center mb-8 border-2 border-black py-4">요 양 급 여 의 뢰 서 (진료의뢰서)</h1>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th rowSpan={3} className="w-16">수신</th>
                        <th style={{ width: '100px' }}>기관기호</th>
                        <td> </td>
                        <th style={{ width: '100px' }}>요양기관명</th>
                        <td> (상급 종합병원) </td>
                    </tr>
                    <tr>
                        <td colSpan={4} className="h-1 text-center bg-slate-50 text-xs">
                            수신할 병원의 정보를 기입하지 않은 경우 환자가 선택하여 방문할 수 있습니다.
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th rowSpan={2} className="w-16">환자</th>
                        <th style={{ width: '100px' }}>성 명</th>
                        <td>{info.name}</td>
                        <th style={{ width: '100px' }}>주민번호</th>
                        <td>{info.rrn}</td>
                    </tr>
                    <tr>
                        <th>주 소</th>
                        <td colSpan={3}>{info.address}</td>
                    </tr>
                </tbody>
            </table>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th className="w-32 bg-slate-50">상 병 명</th>
                        <td className="font-bold p-3">
                            {info.diagnosis} <span className="text-sm font-normal ml-2">({info.kcdCode})</span>
                        </td>
                    </tr>
                    <tr>
                        <th className="bg-slate-50">환자 상태<br />및<br />진료 소견</th>
                        <td className="h-64 align-top p-4 leading-relaxed whitespace-pre-wrap">
                            {info.opinion}
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-8">
                <p className="mb-4 text-sm">
                    「국민건강보험 요양급여의 기준에 관한 규칙」 제 6조의 규정에 의하여 위와 같이 요양급여를 의뢰합니다.
                </p>
                <div className="text-center mt-8">
                    <p className="text-lg font-bold mb-8">2024년 01월 24일</p>
                </div>

                <div className="flex justify-end gap-10 mt-4 pr-10">
                    <div className="text-right">
                        <p className="mb-1">요양기관명 : <strong>{info.hospitalName}</strong></p>
                        <p>진료 의사 : <strong>{info.doctorName}</strong> (인)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}


// =================================================================================================
// 📄 4. 진료 확인서 (Confirmation) - 통원확인서 등
// =================================================================================================
function ConfirmationForm({ info }: { info: PatientInfo }) {
    return (
        <div className="flex flex-col h-full font-serif">
            <h1 className="text-3xl font-extrabold text-center mb-2 underline decoration-4 decoration-slate-900 underline-offset-8">진 료 확 인 서</h1>
            <p className="text-center text-sm mb-10">(통 원 확 인 서)</p>

            <table className="chart-table mb-6">
                <tbody>
                    <tr>
                        <th className="w-24">환 자 명</th>
                        <td>{info.name}</td>
                        <th className="w-24">주민번호</th>
                        <td>{info.rrn}</td>
                    </tr>
                    <tr>
                        <th>주 소</th>
                        <td colSpan={3}>{info.address}</td>
                    </tr>
                    <tr>
                        <th>병 명</th>
                        <td colSpan={3} className="font-bold">{info.diagnosis}</td>
                    </tr>
                    <tr>
                        <th className="h-32 align-middle">진료 기간<br />(내원일)</th>
                        <td colSpan={3} className="align-middle p-4 leading-relaxed font-bold text-lg">
                            {info.visitDates}
                        </td>
                    </tr>
                    <tr>
                        <th className="h-32 align-middle">용 도</th>
                        <td colSpan={3} className="align-middle p-4">
                            학교/회사 제출용
                        </td>
                    </tr>
                </tbody>
            </table>

            <div className="mt-auto mb-20 text-center">
                <p className="text-lg mb-8">상기 환자는 위와 같이 본원에서 진료 받았음을 확인합니다.</p>
                <p className="text-lg font-bold mb-10">2024년 01월 24일</p>

                <div className="text-center font-bold text-xl">
                    <p className="mb-2">{info.hospitalName}</p>
                    <p>의사 {info.doctorName} (인)</p>
                </div>
            </div>
        </div>
    );
}
