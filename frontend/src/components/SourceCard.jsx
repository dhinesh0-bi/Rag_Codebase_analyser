import React, { useState, useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';

/* ============================================================
   PRISM DARK THEME (inline, no external CSS needed)
   ============================================================ */
const PRISM_DARK_THEME = `
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata { color: #6272a4; }

.token.punctuation { color: #ccc; }

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted { color: #f8c555; }

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted { color: #aed581; }

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string { color: #67cdcc; }

.token.atrule,
.token.attr-value,
.token.keyword { color: #c792ea; }

.token.function,
.token.class-name { color: #82aaff; }

.token.regex,
.token.important,
.token.variable { color: #f78c6c; }

.token.important,
.token.bold { font-weight: bold; }
.token.italic { font-style: italic; }
.token.entity { cursor: help; }

code[class*="language-"],
pre[class*="language-"] {
  color: #cdd6f4;
  background: none;
  text-shadow: none;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  line-height: 1.65;
  tab-size: 2;
  hyphens: none;
}
`;

/* ============================================================
   LANGUAGE MAP
   ============================================================ */
const LANG_MAP = {
  py: 'python',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  sh: 'bash',
  bash: 'bash',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  rs: 'rust',
  go: 'go',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
};

function getLanguage(filePath = '') {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'plaintext';
}

function getFileIcon(filePath = '') {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const icons = {
    py: '🐍', js: '🟡', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    json: '📋', css: '🎨', html: '🌐', md: '📝',
    sh: '💻', bash: '💻', go: '🐹', rs: '🦀', java: '☕',
    yaml: '⚙️', yml: '⚙️',
  };
  return icons[ext] || '📄';
}

function getRelevanceColor(score) {
  if (score === undefined || score === null) return 'var(--text-muted)';
  if (score >= 0.8) return 'var(--success)';
  if (score >= 0.6) return 'var(--warning)';
  return 'var(--danger)';
}

function getRelevanceLabel(score) {
  if (score === undefined || score === null) return null;
  if (score >= 0.8) return 'High relevance';
  if (score >= 0.6) return 'Medium relevance';
  return 'Low relevance';
}

/* ============================================================
   HIGHLIGHTED CODE BLOCK
   ============================================================ */
function HighlightedCode({ code, language }) {
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <pre
      style={{
        margin: 0,
        padding: '16px',
        background: 'transparent',
        overflowX: 'auto',
        maxHeight: '320px',
        fontSize: '0.83rem',
        lineHeight: 1.65,
      }}
    >
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
}

/* ============================================================
   SOURCE CARD COMPONENT
   ============================================================ */
export default function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const filePath = source.file_path || source.filepath || source.file || 'unknown';
  const functionName = source.function_name || source.func_name || source.name || null;
  const startLine = source.start_line || source.line_start || source.start || null;
  const endLine = source.end_line || source.line_end || source.end || null;
  const code = source.content || source.code || source.chunk || '';
  const score = source.score || source.relevance_score || source.similarity || null;
  const docstring = source.docstring || source.summary || null;

  const lang = getLanguage(filePath);
  const icon = getFileIcon(filePath);
  const scoreColor = getRelevanceColor(score);
  const scoreLabel = getRelevanceLabel(score);

  // File display name (just filename + parent)
  const pathParts = filePath.replace(/\\/g, '/').split('/');
  const displayPath =
    pathParts.length > 2
      ? `…/${pathParts.slice(-2).join('/')}`
      : filePath;

  const COLLAPSE_LINES = 15;
  const codeLines = code.split('\n');
  const shouldCollapse = codeLines.length > COLLAPSE_LINES;
  const visibleCode = shouldCollapse && !expanded ? codeLines.slice(0, COLLAPSE_LINES).join('\n') : code;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <>
      {/* Inject Prism theme once */}
      <style>{PRISM_DARK_THEME}</style>

      <div
        className="glass-card"
        style={{
          padding: 0,
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          animation: `fadeInUp 0.3s ease ${index * 0.07}s both`,
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(124,58,237,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Card Header */}
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(255,255,255,0.025)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Index badge */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(124,58,237,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--accent-light)',
              flexShrink: 0,
              marginTop: '1px',
            }}
          >
            {index + 1}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* File path row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                marginBottom: '6px',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  wordBreak: 'break-all',
                }}
                title={filePath}
              >
                {displayPath}
              </span>

              {/* Language badge */}
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                {lang}
              </span>
            </div>

            {/* Meta row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {/* Function name */}
              {functionName && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--info)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h3a1 1 0 0 0 1-1V4" />
                    <path d="M4 20h3a1 1 0 0 1 1 1v-1" />
                    <path d="M16 4v1a1 1 0 0 0 1 1h3" />
                    <path d="M16 20v-1a1 1 0 0 1 1-1h3" />
                    <path d="M12 8v8" />
                    <path d="M9 11h6" />
                  </svg>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: 'var(--info)',
                      fontWeight: 600,
                    }}
                  >
                    {functionName}()
                  </span>
                </div>
              )}

              {/* Line range */}
              {startLine && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  Lines {startLine}{endLine && endLine !== startLine ? `–${endLine}` : ''}
                </div>
              )}

              {/* Relevance score */}
              {score !== null && score !== undefined && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginLeft: 'auto',
                  }}
                  title={scoreLabel}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: scoreColor,
                      boxShadow: `0 0 6px ${scoreColor}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: scoreColor,
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {(score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Copy code button */}
          {code && (
            <button
              onClick={handleCopy}
              className="btn btn-ghost btn-sm"
              style={{
                gap: '5px',
                fontSize: '0.75rem',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '7px',
                flexShrink: 0,
              }}
              title="Copy code"
            >
              {copied ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ color: 'var(--success)' }}>Copied</span>
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
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

        {/* Docstring summary */}
        {docstring && (
          <div
            style={{
              padding: '10px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(124,58,237,0.04)',
            }}
          >
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {docstring}
            </p>
          </div>
        )}

        {/* Code block */}
        {code ? (
          <div
            style={{
              background: '#0d0d14',
              position: 'relative',
            }}
          >
            <HighlightedCode code={visibleCode} language={lang} />

            {/* Fade + expand button for long code */}
            {shouldCollapse && (
              <div
                style={{
                  position: shouldCollapse && !expanded ? 'relative' : 'static',
                }}
              >
                {!expanded && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      right: 0,
                      height: '60px',
                      background: 'linear-gradient(to bottom, transparent, #0d0d14)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                <div
                  style={{
                    textAlign: 'center',
                    padding: '10px 0',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      gap: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--accent-light)',
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transform: expanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    {expanded
                      ? 'Collapse'
                      : `Show ${codeLines.length - COLLAPSE_LINES} more lines`}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '20px 18px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            No code preview available
          </div>
        )}
      </div>
    </>
  );
}
