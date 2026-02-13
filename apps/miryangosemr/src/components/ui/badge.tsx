import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors border",
    {
        variants: {
            variant: {
                default: "bg-slate-100 text-slate-700 border-slate-200",
                success: "bg-emerald-50 text-emerald-700 border-emerald-200",
                warning: "bg-amber-50 text-amber-700 border-amber-200",
                danger: "bg-red-50 text-red-700 border-red-200",
                info: "bg-blue-50 text-blue-700 border-blue-200",
                purple: "bg-purple-50 text-purple-700 border-purple-200",
                // Insurance types
                nhis: "bg-blue-50 text-blue-700 border-blue-200",
                auto: "bg-orange-50 text-orange-700 border-orange-200",
                none: "bg-slate-50 text-slate-600 border-slate-200",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
