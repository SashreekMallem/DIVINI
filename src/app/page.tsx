import Link from 'next/link'
import { Zap, ArrowRight, Sparkles, Shield, Mic, Brain, Clock, Target } from 'lucide-react'

export default function HomePage() {
  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.8) 0%, rgba(24, 24, 27, 0.4) 100%)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090b', position: 'relative' }}>
      {/* Ambient glows */}
      <div style={{
        position: 'fixed',
        top: '-200px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '800px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-300px',
        right: '-100px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <header style={{
        height: '72px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}>
              <Zap style={{ width: '22px', height: '22px', color: 'white' }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: '20px' }}>Divini</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/login" style={{ fontSize: '14px', color: '#a1a1aa', textDecoration: 'none' }}>
              Sign in
            </Link>
            <Link
              href="/register"
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                textDecoration: 'none',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 72px - 200px)',
        padding: '80px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: '800px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '100px',
            fontSize: '13px',
            color: '#818cf8',
            marginBottom: '32px',
          }}>
            <Sparkles style={{ width: '14px', height: '14px' }} />
            AI-Powered Interview Coaching
          </div>

          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: '24px',
            letterSpacing: '-0.02em',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Ace every interview
            </span>
            <br />
            <span style={{ color: 'white' }}>with AI coaching</span>
          </h1>

          <p style={{
            fontSize: '18px',
            color: '#71717a',
            marginBottom: '40px',
            maxWidth: '560px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Get real-time AI-generated answers during your interviews.
            Practice smarter, interview better, land your dream job.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <Link
              href="/register"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '16px',
                fontWeight: 600,
                color: 'white',
                textDecoration: 'none',
                fontSize: '16px',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
              }}
            >
              Start Free Trial
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </Link>
            <Link
              href="/login"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 32px',
                background: 'rgba(39, 39, 42, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                fontWeight: 500,
                color: 'white',
                textDecoration: 'none',
                fontSize: '16px',
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '80px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            How it works
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#71717a',
            textAlign: 'center',
            marginBottom: '48px'
          }}>
            Everything you need to nail your next interview
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { icon: Mic, title: 'Real-Time Transcription', desc: 'Automatic speech-to-text captures every word', color: '#6366f1' },
              { icon: Brain, title: 'AI-Powered Answers', desc: 'Get instant coaching based on your resume', color: '#8b5cf6' },
              { icon: Target, title: 'Question Detection', desc: 'Automatically identifies interview questions', color: '#a855f7' },
              { icon: Clock, title: 'Instant Response', desc: 'Answers generated in seconds, not minutes', color: '#ec4899' },
              { icon: Shield, title: 'Private & Secure', desc: 'Your data stays private and encrypted', color: '#22c55e' },
              { icon: Sparkles, title: 'Always Learning', desc: 'AI improves based on your feedback', color: '#3b82f6' },
            ].map((feature, i) => {
              const Icon = feature.icon
              return (
                <div key={i} style={{ ...cardStyle, padding: '28px', textAlign: 'center' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: `${feature.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                  }}>
                    <Icon style={{ width: '28px', height: '28px', color: feature.color }} />
                  </div>
                  <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>{feature.title}</h3>
                  <p style={{ fontSize: '14px', color: '#71717a' }}>{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: '80px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
          ...cardStyle,
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
        }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
            Ready to ace your interviews?
          </h2>
          <p style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '32px' }}>
            Join thousands of candidates who landed their dream jobs
          </p>
          <Link
            href="/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: '16px',
              fontWeight: 600,
              color: 'white',
              textDecoration: 'none',
              fontSize: '16px',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
            }}
          >
            Get Started Free
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap style={{ width: '20px', height: '20px', color: '#6366f1' }} />
            <span style={{ fontWeight: 500, fontSize: '14px' }}>Divini</span>
          </div>
          <p style={{ fontSize: '13px', color: '#52525b' }}>
            © 2024 Divini. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
