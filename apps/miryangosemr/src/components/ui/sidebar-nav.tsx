'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SidebarNavItemProps {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    collapsed?: boolean;
    badge?: string;
}

export function SidebarNavItem({ href, icon, label, active, collapsed, badge }: SidebarNavItemProps) {
    return (
        <Link
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
                active
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            )}
        >
            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r" />}
            <span className={cn('shrink-0', active ? 'text-emerald-400' : 'text-slate-500')}>{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && badge && (
                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {badge}
                </span>
            )}
        </Link>
    );
}
