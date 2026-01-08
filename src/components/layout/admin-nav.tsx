'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNav() {
    const pathname = usePathname()

    return (
        <nav style={{
            backgroundColor: '#18181b',
            borderBottom: '1px solid #27272a',
            padding: '0 32px',
            display: 'flex',
            gap: 8
        }}>
            <Link 
                href="/admin"
                style={{
                    padding: '12px 20px',
                    color: pathname === '/admin' ? '#818cf8' : '#a1a1aa',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    borderBottom: pathname === '/admin' ? '2px solid #818cf8' : '2px solid transparent',
                    marginBottom: -1,
                    transition: 'all 0.2s'
                }}
            >
                Dashboard
            </Link>
            <Link 
                href="/admin/pricing"
                style={{
                    padding: '12px 20px',
                    color: pathname === '/admin/pricing' ? '#818cf8' : '#a1a1aa',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    borderBottom: pathname === '/admin/pricing' ? '2px solid #818cf8' : '2px solid transparent',
                    marginBottom: -1,
                    transition: 'all 0.2s'
                }}
            >
                Pricing
            </Link>
        </nav>
    )
}

