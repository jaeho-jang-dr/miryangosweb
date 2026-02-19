'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  UserPlus,
  Stethoscope,
  FileText,
  Pill,
  FlaskConical,
  HeartPulse,
  CreditCard,
  Building2,
  Store,
  BarChart3,
  CalendarDays,
  Users,
  Archive,
  Database,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: '대시보드', icon: Home },
  { href: '/reception', label: '접수/수납', icon: UserPlus },
  { href: '/consulting', label: '진료실', icon: Stethoscope },
  { href: '/chart', label: '통합 차트', icon: FileText },
  { href: '/prescription', label: '처방전', icon: Pill },
  { href: '/lab', label: '검사실', icon: FlaskConical },
  { href: '/treatment', label: '치료실', icon: HeartPulse },
  { href: '/billing', label: '수납/청구', icon: CreditCard },
  { href: '/claims', label: 'HIRA 청구', icon: Building2 },
  { href: '/certificates', label: '제증명', icon: ClipboardList },
  { href: '/pharmacy', label: '약국 연동', icon: Store },
  { href: '/inpatient', label: '입원관리', icon: Building2 },
  { href: '/statistics', label: '통계/리포트', icon: BarChart3 },
  { href: '/reports', label: '규제 보고서', icon: FileText },
  { href: '/appointments', label: '예약 관리', icon: CalendarDays },
  { href: '/patients', label: '환자 관리', icon: Users },
  { href: '/records', label: '기록조회', icon: Archive },
  { href: '/master', label: '마스터데이터', icon: Database },
  { href: '/setup', label: '설정', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="메인 네비게이션"
      className={clsx(
        'fixed top-0 left-0 h-screen bg-sidebar-bg text-sidebar-text flex flex-col z-40 transition-all duration-200 no-print',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-white/5">
        <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shrink-0">
          <Activity className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <span className="font-bold text-white text-sm tracking-tight whitespace-nowrap">MiryangOS</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">EMR System</span>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav aria-label="사이드바 메뉴" className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group relative',
                active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r" />
              )}
              <Icon className={clsx('w-5 h-5 shrink-0', active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        className="flex items-center justify-center h-10 border-t border-white/5 text-slate-500 hover:text-slate-300 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
