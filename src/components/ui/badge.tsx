import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                default:
                    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
                primary:
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                success:
                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                warning:
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                destructive:
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                info:
                    "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
                outline:
                    "border border-slate-300 bg-transparent text-slate-700 dark:border-slate-600 dark:text-slate-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
