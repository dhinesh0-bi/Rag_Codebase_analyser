import React, { useState } from 'react';
import { useAuth } from '../App';
import { signOutUser } from '../lib/firebase';

export default function Navbar() {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign out failed:', err);
      setSigningOut(false);
    }
  };

  const avatarLetter = user?.email?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || '?';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        width: '100%',
        height: '64px',
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
              flexShrink: 0,
            }}
          >
            🧠
          </div>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.95rem',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                background: 'linear-gradient(135deg, #f1f0ff 0%, var(--accent-light) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Codebase Companion
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
                letterSpacing: '0.04em',
                marginTop: '1px',
              }}
            >
              RAG · Gemini AI
            </div>
          </div>
        </div>

        {/* Center: Status badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--success)',
                animation: 'pulse 2s ease infinite',
              }}
            />
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--success)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Live
            </span>
          </div>

          <div
            style={{
              padding: '5px 12px',
              borderRadius: '999px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--accent-light)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Gemini 1.5 Flash
            </span>
          </div>
        </div>

        {/* Right: User info + Sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* User info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Avatar */}
            {user?.photoURL && !avatarError ? (
              <img
                src={user.photoURL}
                alt="avatar"
                onError={() => setAvatarError(true)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid rgba(124,58,237,0.4)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {avatarLetter}
              </div>
            )}

            {/* Email */}
            <div style={{ lineHeight: 1.2 }}>
              <div
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  maxWidth: '140px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </div>
              {displayEmail && (
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    maxWidth: '140px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayEmail}
                </div>
              )}
            </div>
          </div>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="btn btn-ghost btn-sm"
            style={{
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
            }}
            title="Sign out"
          >
            {signingOut ? (
              <div className="spinner spinner-sm" />
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            )}
            <span style={{ fontSize: '0.8rem' }}>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          nav > div > div:nth-child(2) {
            display: none !important;
          }
          nav > div > div:nth-child(3) > div:first-child > div:last-child {
            display: none !important;
          }
        }
        @media (max-width: 480px) {
          nav {
            padding: 0 16px !important;
          }
        }
      `}</style>
    </nav>
  );
}
