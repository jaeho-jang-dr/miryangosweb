'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-public';
import { Loader2, Search, Trash2, Shield, User, Check, X, Edit2 } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useRouter } from 'next/navigation';

interface UserData {
    id: string; // Document ID (usually UID)
    email: string;
    displayName?: string;
    photoURL?: string;
    role?: string;
    createdAt?: Timestamp;
    phoneNumber?: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('user');

    const { isAdmin, loading: roleLoading } = useAdminRole();
    const router = useRouter();

    // useEffect(() => {
    //     if (!roleLoading && !isAdmin) {
    //         router.push('/admin');
    //     }
    // }, [roleLoading, isAdmin, router]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);

            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserData[];

            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (!confirm(`정말 사용자 ${email} 정보를 삭제하시겠습니까?\n주의: Firestore 데이터만 삭제되며, 실제 인증 계정은 삭제되지 않습니다.`)) return;

        try {
            await deleteDoc(doc(db, 'users', id));
            setUsers(prev => prev.filter(user => user.id !== id));
            alert('사용자 정보가 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const handleEditClick = (user: UserData) => {
        setEditingId(user.id);
        setSelectedRole(user.role || 'user');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setSelectedRole('user');
    };

    const handleSaveRole = async (id: string) => {
        try {
            await updateDoc(doc(db, 'users', id), { role: selectedRole });
            setUsers(prev => prev.map(u => u.id === id ? { ...u, role: selectedRole } : u));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating role:', error);
            alert('권한 수정 중 오류가 발생했습니다.');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
            (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || '');
        const matchesRole = roleFilter === 'all' || (user.role || 'user') === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role?: string) => {
        switch (role) {
            case 'admin':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"><Shield className="w-3 h-3 mr-1" /> 관리자</span>;
            case 'manager':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Shield className="w-3 h-3 mr-1" /> 매니저</span>;
            case 'operator':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><Shield className="w-3 h-3 mr-1" /> 운영자</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400">일반</span>;
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">직원 및 회원 관리</h1>
                    <p className="text-sm text-slate-500 mt-2">사용자에게 관리자, 매니저, 운영자 권한을 부여할 수 있습니다.</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300">
                    총 회원 수: <span className="font-bold text-blue-600 dark:text-blue-400">{users.length}</span>명
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="이름, 이메일 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 outline-none text-sm bg-transparent"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    title="권한 필터"
                    aria-label="권한 필터"
                >
                    <option value="all">모든 권한</option>
                    <option value="admin">관리자</option>
                    <option value="manager">매니저</option>
                    <option value="operator">운영자</option>
                    <option value="user">일반 회원</option>
                </select>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">사용자</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">이메일/연락처</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">가입일</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">권한 설정</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">관리</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    {searchTerm || roleFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 mr-3 overflow-hidden">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="h-full w-full object-cover" />
                                                ) : (
                                                    <User className="h-4 w-4" />
                                                )}
                                            </div>
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {user.displayName || '이름 없음'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-900 dark:text-white">{user.email}</div>
                                        {user.phoneNumber && <div className="text-xs text-slate-500">{user.phoneNumber}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {editingId === user.id ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedRole}
                                                    onChange={(e) => setSelectedRole(e.target.value)}
                                                    className="pl-2 pr-8 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    title="권한 변경"
                                                    aria-label="권한 변경"
                                                >
                                                    <option value="user">일반 회원</option>
                                                    <option value="operator">운영자 (Tier 3)</option>
                                                    <option value="manager">매니저 (Tier 2)</option>
                                                    <option value="admin">관리자 (Tier 1)</option>
                                                </select>
                                                <button
                                                    onClick={() => handleSaveRole(user.id)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    title="저장"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                                    title="취소"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                {getRoleBadge(user.role)}
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-all"
                                                    title="권한 수정"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(user.id, user.email)}
                                            className="text-slate-400 hover:text-red-600 transition-colors p-2"
                                            title="삭제"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

