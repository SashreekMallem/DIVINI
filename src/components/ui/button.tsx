import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:opacity-50 disabled:pointer-events-none'

        const variants = {
            primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:ring-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
            secondary: 'bg-zinc-800 text-white hover:bg-zinc-700 focus-visible:ring-zinc-600',
            ghost: 'text-zinc-400 hover:text-white hover:bg-white/5 focus-visible:ring-zinc-600',
            danger: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500',
            outline: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:ring-zinc-600',
        }

        const sizes = {
            sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
            md: 'h-10 px-4 text-sm rounded-xl gap-2',
            lg: 'h-12 px-6 text-base rounded-xl gap-2',
        }

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'

export { Button }
