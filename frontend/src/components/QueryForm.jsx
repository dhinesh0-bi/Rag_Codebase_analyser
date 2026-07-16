import React, { useState } from 'react';

const EXAMPLE_QUERIES = [
  {
    repo: 'https://github.com/pallets/flask',
    question: 'How does Flask handle request routing?',
    label: 'Flask routing',
  },
  {
    repo: 'https://github.com/django/django',
    question: 'Explain the Django ORM query mechanism',
    label: 'Django ORM',
  },
  {
    repo: 'https://github.com/tiangolo/fastapi',
    question: 'How does FastAPI handle dependency injection?',
    label: 'FastAPI DI',
  },
  {
    repo: 'https://github.com/psf/requests',
    question: 'How does the requests library handle sessions?',
    label: 'Requests session',
  },
];

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SendIcon({ loading }) {
  if (loading) return <div className="spinner spinner-sm" />;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default function QueryForm({ onSubmit, isLoading }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [urlError, setUrlError] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [showExamples, setShowExamples] = useState(true);

  const validateUrl = (url) => {
    if (!url.trim()) return 'Please enter a GitHub repository URL';
    if (!url.includes('github.com')) return 'URL must be a valid GitHub repository (github.com)';
    try {
      new URL(url);
    } catch {
      return 'Please enter a valid URL';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const urlErr = validateUrl(repoUrl);
    const qErr = question.trim() ? '' : 'Please enter your question';
    setUrlError(urlErr);
    setQuestionError(qErr);
    if (urlErr || qErr) return;
    onSubmit(repoUrl.trim(), question.trim());
  };

  const fillExample = (ex) => {
    setRepoUrl(ex.repo);
    setQuestion(ex.question);
    setUrlError('');
    setQuestionError('');
  };

  const handleUrlChange = (e) => {
    setRepoUrl(e.target.value);
    if (urlError) setUrlError(validateUrl(e.target.value));
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '18px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '22px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(124,58,237,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-light)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          Query Codebase
        </h3>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Repo URL */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            GitHub Repository URL
          </label>
          <div className="input-wrapper">
            <div className="input-icon" style={{ color: 'var(--text-muted)' }}>
              <GitHubIcon />
            </div>
            <input
              type="url"
              className={`input-field input-with-icon${urlError ? ' input-error' : ''}`}
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={handleUrlChange}
              onBlur={() => setUrlError(validateUrl(repoUrl))}
              disabled={isLoading}
              style={urlError ? { borderColor: 'var(--danger)' } : {}}
            />
          </div>
          {urlError && (
            <p
              style={{
                marginTop: '6px',
                fontSize: '0.77rem',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>⚠</span> {urlError}
            </p>
          )}
        </div>

        {/* Question */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            Your Question
          </label>
          <div className="input-wrapper">
            <div className="input-icon" style={{ top: '14px', transform: 'none', color: 'var(--text-muted)' }}>
              <QuestionIcon />
            </div>
            <textarea
              className={`input-field input-with-icon textarea-field${questionError ? ' input-error' : ''}`}
              placeholder="e.g. How does authentication work in this codebase?"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                if (questionError && e.target.value.trim()) setQuestionError('');
              }}
              disabled={isLoading}
              rows={4}
              style={questionError ? { borderColor: 'var(--danger)' } : {}}
            />
          </div>
          {questionError && (
            <p
              style={{
                marginTop: '6px',
                fontSize: '0.77rem',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>⚠</span> {questionError}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {question.length}/1000
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading}
          style={{ borderRadius: '10px', padding: '13px', fontSize: '0.92rem', gap: '8px' }}
        >
          <SendIcon loading={isLoading} />
          {isLoading ? 'Analyzing codebase…' : 'Ask Gemini AI'}
        </button>
      </form>

      {/* Example queries */}
      <div style={{ marginTop: '20px' }}>
        <button
          type="button"
          onClick={() => setShowExamples((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '4px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              transform: showExamples ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Examples
        </button>

        {showExamples && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '10px',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => fillExample(ex)}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124,58,237,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: 'rgba(124,58,237,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent-light)">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '2px',
                    }}
                  >
                    {ex.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    {ex.question}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
