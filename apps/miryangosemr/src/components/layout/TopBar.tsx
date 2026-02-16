'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, LogOut, Hospital, Settings, ExternalLink } from 'lucide-react';
import { User } from 'firebase/auth';
import { ROLE_LABELS, UserRole } from '@/lib/auth-context';
import clsx from 'clsx';

interface TopBarProps {
  user: User | null;
  sidebarCollapsed: boolean;
  onSignOut: () => void;
  userName?: string;
  userRole?: UserRole;
}

const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3001';

export default function TopBar({ user, sidebarCollapsed, onSignOut, userName, userRole }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = userName || user?.email?.split('@')[0] || 'Staff';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 transition-all duration-200 no-print',
        sidebarCollapsed ? 'left-16' : 'left-60'
      )}
    >
      {/* Search */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="환자 검색 (이름, 차트번호)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
          />
        </div>
      </div>

      {/* App Links + User */}
      <div className="flex items-center gap-2">
        {/* App Links */}
        <div className="hidden md:flex items-center gap-1 mr-2">
          <a
            href={WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
          >
            <Hospital className="w-3.5 h-3.5" />
            홈페이지
          </a>
          <a
            href={`${WEBSITE_URL}/admin`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
          >
            <span className="text-sm">🦄</span>
            CMS
          </a>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-md">
            <ExternalLink className="w-3.5 h-3.5" />
            EMR
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
              {initials}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-sm font-medium text-slate-600 block max-w-[100px] truncate leading-tight">
                {displayName}
              </span>
              {userRole && (
                <span className="text-[10px] text-slate-400 leading-tight">{ROLE_LABELS[userRole]}</span>
              )}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 p-1 z-50">
                {user && (
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-medium text-slate-600 truncate">{user.email}</p>
                    {userRole && <p className="text-[10px] text-slate-400">{ROLE_LABELS[userRole]}</p>}
                  </div>
                )}
                <Link
                  href="/setup"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  설정
                </Link>
                <button
                  onClick={() => { setShowUserMenu(false); onSignOut(); }}
                  className="w-full flex items-center px-3 py-2 text-sm text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
