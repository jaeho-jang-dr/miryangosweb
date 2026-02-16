'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

/** 사용자 역할 */
export type UserRole = 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'billing' | 'viewer';

/** 역할별 라벨 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '관리자',
  doctor: '의사',
  nurse: '간호사',
  receptionist: '접수',
  billing: '수납',
  viewer: '조회',
};

/** 역할별 접근 가능 경로 패턴 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  doctor: ['/dashboard', '/consulting', '/chart', '/prescription', '/lab', '/treatment', '/patients', '/records', '/inpatient', '/statistics', '/certificates'],
  nurse: ['/dashboard', '/reception', '/consulting', '/chart', '/treatment', '/lab', '/patients', '/inpatient', '/records'],
  receptionist: ['/dashboard', '/reception', '/patients', '/appointments', '/billing', '/records'],
  billing: ['/dashboard', '/billing', '/claims', '/statistics', '/reports', '/records'],
  viewer: ['/dashboard', '/chart', '/records', '/statistics'],
};

/** 확장 사용자 프로필 */
export interface EMRUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  firebaseUser: User;
}

interface AuthContextType {
  user: EMRUser | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  hasPermission: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOutUser: async () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<EMRUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user role from Firestore (graceful fallback to 'admin' for first user)
        let role: UserRole = 'admin';
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            role = (userDoc.data().role as UserRole) || 'admin';
          } else {
            // Auto-create user document for first-time login
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                role: 'admin',
                createdAt: serverTimestamp(),
              });
            } catch (createErr) {
              console.warn('[Auth] Auto-create user doc failed (non-critical):', createErr);
            }
          }
        } catch (e) {
          console.warn('[Auth] Failed to fetch user role, defaulting to admin:', e);
        }

        // Register session (non-blocking, fail-safe)
        try {
          await setDoc(doc(db, 'sessions', firebaseUser.uid), {
            sessionId: Date.now().toString(36) + Math.random().toString(36).substring(2, 10),
            userId: firebaseUser.uid,
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          });
        } catch (e) {
          // Session registration is non-critical - don't block login
          console.warn('[Auth] Session registration failed (non-critical):', e);
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role,
          firebaseUser,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOutUser = async () => {
    if (user) {
      try {
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'sessions', user.uid));
      } catch (_) {}
    }
    await signOut(auth);
    setUser(null);
  };

  const hasPermission = (path: string): boolean => {
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role];
    if (perms.includes('*')) return true;
    return perms.some(p => path === p || path.startsWith(p + '/'));
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOutUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
