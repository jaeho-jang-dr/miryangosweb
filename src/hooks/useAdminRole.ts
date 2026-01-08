'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-public';

export function useAdminRole() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setRole(userDoc.data().role || 'user');
                    } else {
                        setRole('user');
                    }
                } catch (error) {
                    console.error("Role fetch error", error);
                    setRole('user');
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        role,
        loading,
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isOperator: role === 'operator',
        // Helper to check if user has ANY of the permitted roles
        checkAccess: (permittedRoles: string[]) => permittedRoles.includes(role || ''),
    };
}
