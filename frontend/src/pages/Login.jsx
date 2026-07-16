import React, { useState, useRef } from 'react';
import { signInWithGoogle, signInWithEmail } from '../lib/firebase';
import { useAuth } from '../App';

/* ============================================================
   ANIMATED BACKGROUND ORBS
   ============================================================ */
function BackgroundOrbs() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Large purple orb — top left */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-8%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      {/* Blue/indigo orb — bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite reverse',
        }}
      />
      {/* Small accent orb — center right */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          right: '15%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '2s',
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

/* ============================================================
   FEATURE BULLET
   ============================================================ */
function FeatureBullet({ icon, title, description }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(124,58,237,0.18)',
          border: '1px solid rgba(124,58,237,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            marginBottom: '2px',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</div>
      </div>
    </div>
  );
}

/* ============================================================
   LOGIN PAGE
   ============================================================ */
export default function Login() {
  const { } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const emailRef = useRef(null);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password.trim()) { setError('Please enter your password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailForm = () => {
    setShowEmailForm((v) => !v);
    setError('');
    setTimeout(() => emailRef.current?.focus(), 100);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        position: 'relative',
        padding: '24px',
      }}
    >
      <BackgroundOrbs />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '940px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeInUp 0.5s ease',
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(124,58,237,0.2) 0%, rgba(79,70,229,0.15) 100%)',
            backdropFilter: 'blur(40px)',
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              left: '-60px',
              width: '280px',
              height: '280px',
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative' }}>
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '40px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                }}
              >
                🧠
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Codebase
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.02em',
                    marginTop: '-4px',
                  }}
                >
                  Companion
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '16px',
                color: 'var(--text-primary)',
              }}
            >
              Understand any
              <br />
              <span
                style={{
                  background: 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                codebase instantly
              </span>
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                marginBottom: '40px',
              }}
            >
              AI-powered code understanding, powered by RAG and Google Gemini. Ask anything
              about any GitHub repository.
            </p>

            {/* Features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <FeatureBullet
                icon="🌳"
                title="AST Parsing"
                description="Deep syntax tree analysis for precise code understanding"
              />
              <FeatureBullet
                icon="🔍"
                title="Vector Search"
                description="Semantic search across thousands of code chunks instantly"
              />
              <FeatureBullet
                icon="✨"
                title="Gemini AI"
                description="Powered by Google Gemini 1.5 Flash for lightning-fast answers"
              />
            </div>
          </div>

          {/* Bottom tagline */}
          <div
            style={{
              position: 'relative',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Trusted by developers worldwide · Powered by RAG
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          style={{
            background: 'rgba(10,10,15,0.92)',
            backdropFilter: 'blur(40px)',
            padding: '56px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: '36px' }}>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                marginBottom: '8px',
              }}
            >
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Sign in to start exploring your codebases
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '10px',
                marginBottom: '20px',
                animation: 'fadeInUp 0.3s ease',
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--danger)', lineHeight: 1.5 }}>
                {error}
              </span>
            </div>
          )}

          {/* Google Sign-In */}
          <button
            className="btn btn-google btn-xl w-full"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            style={{ marginBottom: '16px', borderRadius: '12px', gap: '12px' }}
          >
            {googleLoading ? (
              <div className="spinner spinner-sm" style={{ borderTopColor: '#4285f4' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="divider-with-text" style={{ margin: '20px 0' }}>
            or
          </div>

          {/* Email Form Toggle */}
          {!showEmailForm ? (
            <button
              className="btn btn-secondary btn-xl w-full"
              onClick={toggleEmailForm}
              style={{ borderRadius: '12px' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Continue with Email
            </button>
          ) : (
            <form
              onSubmit={handleEmailSignIn}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div className="input-wrapper">
                <div className="input-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  ref={emailRef}
                  type="email"
                  className="input-field input-with-icon"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="input-wrapper">
                <div className="input-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type="password"
                  className="input-field input-with-icon"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1, borderRadius: '10px', padding: '13px' }}
                >
                  {loading ? (
                    <>
                      <div className="spinner spinner-sm" />
                      Signing in…
                    </>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowEmailForm(false)}
                  style={{ borderRadius: '10px', padding: '13px' }}
                >
                  Cancel
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsSignUp((v) => !v)}
                style={{ fontSize: '0.82rem', color: 'var(--accent-light)' }}
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Create one"}
              </button>
            </form>
          )}

          {/* Footer note */}
          <p
            style={{
              marginTop: '32px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            By signing in, you agree to our Terms of Service and Privacy Policy.
            <br />
            Your data is secured with Firebase Authentication.
          </p>
        </div>
      </div>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 700px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="padding: 56px 48px"] {
            padding: 36px 28px !important;
          }
        }
      `}</style>
    </div>
  );
}
