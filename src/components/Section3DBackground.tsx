// Section3DBackground.tsx
// A premium 3D background component using react-three-fiber and drei.
// Implements "Apple-style" minimalist yet dynamic aesthetics with glassmorphism and smooth animations.

'use client';

import dynamic from 'next/dynamic';
import * as React from "react";

export type Variant = "waves" | "particles" | "grid" | "dots" | "cubes" | "rings" | "diamonds";

interface Props {
    variant: Variant;
    className?: string;
}

// Lazy load the actual 3D component to avoid SSR issues
const Dynamic3DBackground = dynamic(
    () => import('./Section3DBackground.client'),
    {
        ssr: false,
        loading: () => <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-slate-50/50 to-slate-100/50" />
    }
);

export default function Section3DBackground({ variant, className }: Props) {
    return <Dynamic3DBackground variant={variant} className={className} />;
}
