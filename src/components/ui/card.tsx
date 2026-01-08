import { forwardRef } from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'glass'
    hover?: boolean
    children: React.ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', variant = 'default', hover = false, children, ...props }, ref) => {
        const baseStyles = 'rounded-2xl transition-all duration-300'

        const variants = {
            default: 'bg-zinc-900/50 border border-zinc-800',
            elevated: 'bg-zinc-900 border border-zinc-800 shadow-lg',
            glass: 'glass glass-border',
        }

        const hoverStyles = hover ? 'hover:border-zinc-700 hover:bg-zinc-900/80 cursor-pointer' : ''

        return (
            <div
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
                {...props}
            >
                {children}
            </div>
        )
    }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div ref={ref} className={`p-5 border-b border-zinc-800 ${className}`} {...props} />
    )
)
CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className = '', ...props }, ref) => (
        <div ref={ref} className={`p-5 ${className}`} {...props} />
    )
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardContent }
