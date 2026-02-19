'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-public';
import type { ClinicalRole } from '@/types/security';

// ClinicalRole 유효성 가드
function isClinicalRole(value: unknown): value is ClinicalRole {
    return (
        typeof value === 'string' &&
        ['admin', 'manager', 'operator', 'viewer'].includes(value)
    );
}

export function useAdminRole() {
    const [role, setRole] = useState<ClinicalRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const rawRole = userDoc.data().role;
                        setRole(isClinicalRole(rawRole) ? rawRole : 'viewer');
                    } else {
                        setRole('viewer');
                    }
                } catch (error) {
                    console.error("Role fetch error", error);
                    setRole('viewer');
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
        checkAccess: (permittedRoles: ClinicalRole[]) => permittedRoles.includes(role as ClinicalRole),
    };
}
