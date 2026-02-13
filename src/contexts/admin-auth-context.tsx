
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-public';
import { Loader2 } from 'lucide-react';

interface AdminAuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Show loading spinner while checking auth state, except on login page (to avoid flash)
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <AdminAuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AdminAuthContext.Provider>
    );
}
