import React, { useState, useCallback, useEffect } from 'react';
import Navbar from '../components/Navbar';
import QueryForm from '../components/QueryForm';
import AnswerStream from '../components/AnswerStream';
import SourceCard from '../components/SourceCard';
import RateLimitBar from '../components/RateLimitBar';
import { sendChatRequest } from '../lib/api';

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' && '✅'}
            {t.type === 'error' && '❌'}
            {t.type === 'info' && 'ℹ️'}
          </span>
          <div className="toast-content">
            {t.title && <div className="toast-title">{t.title}</div>}
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   WELCOME STATE
   ============================================================ */
function WelcomeState() {
  const examples = [
    { icon: '🐍', text: 'Flask', url: 'https://github.com/pallets/flask' },
    { icon: '⚛️', text: 'React', url: 'https://github.com/facebook/react' },
    { icon: '🦀', text: 'Rust', url: 'https://github.com/rust-lang/rust' },
    { icon: '🐼', text: 'Pandas', url: 'https://github.com/pandas-dev/pandas' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '48px 24px',
        textAlign: 'center',
        animation: 'fadeInUp 0.5s ease',
      }}
    >
      {/* Hero icon */}
      <div
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.2))',
          border: '1px solid rgba(124,58,237,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          marginBottom: '28px',
          boxShadow: '0 0 40px rgba(124,58,237,0.2)',
        }}
      >
        🧠
      </div>

      <h2
        style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '12px',
          background: 'var(--accent-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Ask Anything About Any Codebase
      </h2>

      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          maxWidth: '480px',
          lineHeight: 1.7,
          marginBottom: '36px',
        }}
      >
        Enter a GitHub repository URL and ask your question. Our RAG pipeline will analyze
        the code and provide accurate, cited answers using Gemini AI.
      </p>

      {/* Example repos */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            marginBottom: '12px',
          }}
        >
          Popular Repositories
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {examples.map((ex) => (
            <div
              key={ex.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span>{ex.icon}</span>
              <span>{ex.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          maxWidth: '600px',
          marginTop: '24px',
        }}
      >
        {[
          { step: '01', label: 'Paste repo URL', icon: '🔗' },
          { step: '02', label: 'Ask your question', icon: '💬' },
          { step: '03', label: 'Get cited answers', icon: '✨' },
        ].map((item) => (
          <div
            key={item.step}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{item.icon}</div>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--accent-light)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              {item.step}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState([]);
  const [hasResult, setHasResult] = useState(false);
  const [rateLimitKey, setRateLimitKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = React.useRef(0);

  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (repoUrl, question) => {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamText('');
      setSources([]);
      setHasResult(true);

      await sendChatRequest(
        repoUrl,
        question,
        (chunk, fullText) => {
          setStreamText(fullText);
        },
        (fullAnswer, finalSources) => {
          setStreamText(fullAnswer);
          setSources(finalSources || []);
          setIsLoading(false);
          setIsStreaming(false);
          setRateLimitKey((k) => k + 1);
          if (finalSources && finalSources.length > 0) {
            addToast(
              'success',
              'Answer ready',
              `Found ${finalSources.length} relevant code source${finalSources.length !== 1 ? 's' : ''}`
            );
          }
        },
        (errorMessage) => {
          setIsLoading(false);
          setIsStreaming(false);
          setHasResult(false);
          addToast('error', 'Request failed', errorMessage);
        }
      );
    },
    [addToast]
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Navbar */}
      <Navbar />

      {/* Main layout */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: '0',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%',
          padding: '24px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left sidebar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'sticky',
            top: '88px',
          }}
        >
          <QueryForm onSubmit={handleSubmit} isLoading={isLoading} />
          <RateLimitBar key={rateLimitKey} />
        </div>

        {/* Right content area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          {!hasResult ? (
            <WelcomeState />
          ) : (
            <>
              <AnswerStream text={streamText} isStreaming={isStreaming} isLoading={isLoading} />

              {sources.length > 0 && (
                <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '16px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      Source Citations
                    </h3>
                    <span className="badge badge-purple">{sources.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {sources.map((source, index) => (
                      <SourceCard
                        key={`${source.file_path || source.filepath || index}-${index}`}
                        source={source}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 380px 1fr"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
          div[style*="grid-template-columns: repeat(3, 1fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          div[style*="padding: 24px"] {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
