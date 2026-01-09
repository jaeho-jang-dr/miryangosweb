'use client';

import { useState, useEffect, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { useSearchParams } from 'next/navigation';

import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ProfileData {
    name: string;
    role: string;
    greeting: string;
    history: string;
    imageUrl: string;
}

export default function DoctorProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen pt-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <DoctorProfileContent />
        </Suspense>
    );
}

function DoctorProfileContent() {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const searchParams = useSearchParams();
    const isGreetingOnly = searchParams.get('view') === 'greeting';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const docRef = doc(db, 'settings', 'director_profile');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfile(docSnap.data() as ProfileData);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen pt-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen pt-20">
                <div className="container mx-auto px-4 py-12 text-center">
                    <p className="text-slate-500">프로필 정보가 없습니다.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 pb-20">
            {/* Header */}
            <section className="bg-slate-50 dark:bg-slate-900 py-12 mb-12">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        의료진 소개
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        환자분의 건강과 행복을 위해 최선을 다하겠습니다.
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid md:grid-cols-12 gap-12 items-start">
                    {/* Left Column: Image & Basic Info */}
                    <div className="md:col-span-5 lg:col-span-4 sticky top-24">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700">
                            <div className="aspect-[3/4] relative bg-slate-100 dark:bg-slate-700">
                                {profile.imageUrl ? (
                                    <img
                                        src={profile.imageUrl}
                                        alt={profile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                            <div className="p-6 text-center bg-white dark:bg-slate-800">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                    {profile.name}
                                </h2>
                                <p className="text-blue-600 dark:text-blue-400 font-medium">
                                    {profile.role}
                                </p>
                            </div>
                        </div>
                    </div>



                    {/* Right Column: Greeting & History */}
                    <div className="md:col-span-7 lg:col-span-8 space-y-12">
                        {/* Greeting */}
                        <div className="prose prose-lg dark:prose-invert max-w-none">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 border-b pb-4 border-slate-200 dark:border-slate-700">
                                인사말
                            </h3>
                            <div className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-orlaxed">
                                {profile.greeting || "안녕하세요. 밀양정형외과입니다."}
                            </div>
                        </div>

                        {/* History - Conditionally Rendered */}
                        {!isGreetingOnly && (
                            <div className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                <ReactMarkdown>{profile.history}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
