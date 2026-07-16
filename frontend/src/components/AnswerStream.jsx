import React, { useState, useRef, useEffect } from 'react';

/* ============================================================
   INLINE MARKDOWN RENDERER
   Handles: **bold**, `code`, *italic*, and line breaks
   ============================================================ */
function renderInlineMarkdown(text) {
  const parts = [];
  // Process the text to find markdown patterns
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1].startsWith('**')) {
      parts.push(
        <strong key={key++} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {match[2]}
        </strong>
      );
    } else if (match[1].startsWith('`')) {
      parts.push(
        <code
          key={key++}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.88em',
            padding: '2px 7px',
            borderRadius: '5px',
            background: 'rgba(124,58,237,0.15)',
            color: 'var(--accent-light)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}
        >
          {match[3]}
        </code>
      );
    } else if (match[1].startsWith('*')) {
      parts.push(
        <em key={key++} style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {match[4]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderMarkdownText(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        // Close code block
        elements.push(
          <div
            key={key++}
            style={{
              background: '#0d0d14',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              overflow: 'hidden',
              margin: '12px 0',
            }}
          >
            {codeLang && (
              <div
                style={{
                  padding: '7px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--accent-light)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {codeLang}
              </div>
            )}
            <pre
              style={{
                margin: 0,
                padding: '14px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.84rem',
                lineHeight: 1.65,
                overflowX: 'auto',
                color: '#e2e0ff',
              }}
            >
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeLines = [];
        codeLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h5
          key={key++}
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '16px 0 8px',
            letterSpacing: '-0.01em',
          }}
        >
          {renderInlineMarkdown(line.slice(4))}
        </h5>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h4
          key={key++}
          style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '20px 0 10px',
          }}
        >
          {renderInlineMarkdown(line.slice(3))}
        </h4>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h3
          key={key++}
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '24px 0 12px',
          }}
        >
          {renderInlineMarkdown(line.slice(2))}
        </h3>
      );
    }
    // Bullet list items
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      elements.push(
        <div
          key={key++}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '6px',
            paddingLeft: '4px',
          }}
        >
          <span
            style={{
              color: 'var(--accent-light)',
              fontWeight: 700,
              marginTop: '1px',
              flexShrink: 0,
              fontSize: '0.9em',
            }}
          >
            ›
          </span>
          <span
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.92rem',
              lineHeight: 1.7,
            }}
          >
            {renderInlineMarkdown(line.slice(2))}
          </span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        elements.push(
          <div
            key={key++}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                color: 'var(--accent-light)',
                fontWeight: 700,
                fontSize: '0.82rem',
                minWidth: '20px',
                marginTop: '3px',
              }}
            >
              {numMatch[1]}.
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
              {renderInlineMarkdown(numMatch[2])}
            </span>
          </div>
        );
      }
    }
    // Horizontal rule
    else if (line === '---' || line === '***') {
      elements.push(
        <hr
          key={key++}
          style={{
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            margin: '16px 0',
          }}
        />
      );
    }
    // Empty line
    else if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: '8px' }} />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p
          key={key++}
          style={{
            fontSize: '0.92rem',
            lineHeight: 1.75,
            color: 'var(--text-secondary)',
            margin: '0 0 4px',
          }}
        >
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  }

  return elements;
}

/* ============================================================
   ANSWER STREAM COMPONENT
   ============================================================ */
export default function AnswerStream({ text, isStreaming, isLoading }) {
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [text, isStreaming]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: 0,
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.3s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.025)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Gemini icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))',
              border: '1px solid rgba(124,58,237,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
          >
            ✨
          </div>
          <div>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              AI Answer
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              gemini-1.5-flash
            </div>
          </div>

          {/* Gemini badge */}
          <span className="badge badge-purple" style={{ marginLeft: '4px' }}>
            Gemini
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Streaming indicator */}
          {isStreaming && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.75rem',
                color: 'var(--accent-light)',
                fontWeight: 500,
              }}
            >
              <div className="spinner spinner-sm spinner-purple" />
              Generating…
            </div>
          )}

          {/* Copy button */}
          {!isStreaming && text && (
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-sm"
              style={{
                gap: '6px',
                fontSize: '0.78rem',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '7px',
              }}
              title="Copy answer"
            >
              {copied ? (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: 'var(--success)' }}>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          padding: '22px 24px',
          minHeight: '120px',
          maxHeight: '600px',
          overflowY: 'auto',
        }}
      >
        {isLoading && !text ? (
          /* Initial loading skeleton */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[100, 90, 95, 75, 85].map((w, i) => (
              <div
                key={i}
                className="skeleton"
                style={{
                  height: '14px',
                  borderRadius: '6px',
                  width: `${w}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
            <div style={{ height: '8px' }} />
            {[88, 92, 70].map((w, i) => (
              <div
                key={`b${i}`}
                className="skeleton"
                style={{
                  height: '14px',
                  borderRadius: '6px',
                  width: `${w}%`,
                  animationDelay: `${(i + 5) * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <div>
            {renderMarkdownText(text)}
            {isStreaming && <span className="cursor-blink" />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Footer stats */}
      {!isStreaming && text && (
        <div
          style={{
            padding: '10px 22px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            📝 {text.split(' ').filter(Boolean).length} words
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {text.length} chars
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--success)',
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Complete
          </span>
        </div>
      )}
    </div>
  );
}
