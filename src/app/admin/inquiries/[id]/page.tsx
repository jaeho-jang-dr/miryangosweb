
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { ChevronLeft, Loader2, Calendar, Phone, User, MessageSquare, Check, X, Clock, Trash2 } from 'lucide-react';

export default function InquiryDetailPage() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();

    const [inquiry, setInquiry] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (id) fetchInquiry();
    }, [id]);

    const fetchInquiry = async () => {
        try {
            const docRef = doc(db, 'inquiries', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setInquiry({ id: docSnap.id, ...docSnap.data() });
            } else {
                alert('문의를 찾을 수 없습니다.');
                router.push('/admin/inquiries');
            }
        } catch (error) {
            console.error('Error fetching inquiry:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!confirm(`상태를 '${newStatus === 'confirmed' ? '확인됨' : '완료'}'으로 변경하시겠습니까?`)) return;
        setProcessing(true);
        try {
            await updateDoc(doc(db, 'inquiries', id), { status: newStatus });
            setInquiry((prev: any) => ({ ...prev, status: newStatus }));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('상태 변경에 실패했습니다.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (!inquiry) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/admin/inquiries" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ChevronLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">문의 상세 정보</h1>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${inquiry.type === 'reservation' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                            {inquiry.type === 'reservation' ? '진료 예약' : '일반 문의'}
                        </span>
                        <span className="text-sm text-slate-500">
                            {inquiry.createdAt?.toDate?.().toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${inquiry.status === 'new' ? 'bg-red-100 text-red-800' :
                            inquiry.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {inquiry.status === 'new' ? '신규' : inquiry.status === 'confirmed' ? '확인됨' : '완료'}
                        </span>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">이름</label>
                                <div className="flex items-center text-slate-900 dark:text-white font-medium">
                                    <User className="h-4 w-4 mr-2 text-slate-400" />
                                    {inquiry.name}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">연락처</label>
                                <div className="flex items-center text-slate-900 dark:text-white font-medium">
                                    <Phone className="h-4 w-4 mr-2 text-slate-400" />
                                    {inquiry.contact}
                                </div>
                            </div>
                        </div>

                        {inquiry.type === 'reservation' && (
                            <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg border border-orange-100 dark:border-orange-900/20">
                                <label className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block mb-1">예약 희망 일시</label>
                                <div className="flex items-center text-orange-900 dark:text-orange-200 font-bold text-lg">
                                    <Calendar className="h-5 w-5 mr-2" />
                                    {inquiry.reservationDate ? `${inquiry.reservationDate} ${inquiry.reservationTime}` : '날짜 미지정'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-700 pt-6">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">문의 내용</label>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap min-h-[150px]">
                            {inquiry.message}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                    <button
                        onClick={async () => {
                            if (!confirm('정말 이 예약/문의를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return;
                            setProcessing(true);
                            try {
                                await deleteDoc(doc(db, 'inquiries', id));
                                alert('삭제되었습니다.');
                                router.push('/admin/inquiries');
                            } catch (error) {
                                console.error('Error deleting:', error);
                                alert('삭제에 실패했습니다.');
                                setProcessing(false);
                            }
                        }}
                        disabled={processing}
                        className="inline-flex items-center px-4 py-2 border border-red-200 dark:border-red-900/50 shadow-sm text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 mr-auto"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        예약 취소 및 삭제
                    </button>

                    {inquiry.status !== 'completed' && (
                        <>
                            {inquiry.status === 'new' && (
                                <button
                                    onClick={() => updateStatus('confirmed')}
                                    disabled={processing}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="animate-spin h-4 w-4" /> : <Check className="h-4 w-4 mr-2" />}
                                    확인 처리
                                </button>
                            )}
                            <button
                                onClick={() => updateStatus('completed')}
                                disabled={processing}
                                className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 shadow-sm text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="animate-spin h-4 w-4" /> : <Clock className="h-4 w-4 mr-2" />}
                                상담 완료 처리
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
