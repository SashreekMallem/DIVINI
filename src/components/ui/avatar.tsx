interface AvatarProps {
    src?: string | null
    alt?: string
    fallback: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function Avatar({
    src,
    alt = '',
    fallback,
    size = 'md',
    className = ''
}: AvatarProps) {
    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    }

    if (src) {
        return (
            <img
                src={src}
                alt={alt}
                className={`${sizes[size]} rounded-full object-cover ${className}`}
            />
        )
    }

    return (
        <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-medium text-white ${className}`}>
            {fallback.charAt(0).toUpperCase()}
        </div>
    )
}
