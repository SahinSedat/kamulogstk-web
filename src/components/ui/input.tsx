import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string
    label?: string
    helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, helperText, id, ...props }, ref) => {
        const inputId = id || React.useId()

        return (
            <div className="space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        {label}
                    </label>
                )}
                <input
                    type={type}
                    id={inputId}
                    className={cn(
                        "flex h-11 w-full rounded-lg border bg-white px-4 py-2 text-sm transition-all duration-200",
                        "placeholder:text-slate-400",
                        "focus:outline-none focus:ring-2 focus:ring-offset-0",
                        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
                        "dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500",
                        error
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500"
                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-slate-700 dark:focus:border-blue-500",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {(error || helperText) && (
                    <p className={cn(
                        "text-xs",
                        error ? "text-red-500" : "text-slate-500 dark:text-slate-400"
                    )}>
                        {error || helperText}
                    </p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
