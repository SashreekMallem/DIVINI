interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
    size?: 'sm' | 'md'
    children: React.ReactNode
    className?: string
}

export function Badge({
    variant = 'default',
    size = 'sm',
    children,
    className = ''
}: BadgeProps) {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300',
        success: 'bg-green-500/10 text-green-400',
        warning: 'bg-yellow-500/10 text-yellow-400',
        danger: 'bg-red-500/10 text-red-400',
        info: 'bg-blue-500/10 text-blue-400',
        purple: 'bg-purple-500/10 text-purple-400',
    }

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
    }

    return (
        <span className={`inline-flex items-center font-medium rounded-lg ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    )
}
