import React, { useState, useEffect, useCallback } from 'react';
import { getRateLimit } from '../lib/api';
import { useAuth } from '../App';

function formatResetTime(resetTime) {
  if (!resetTime) return 'Unknown';
  try {
    const date = new Date(resetTime);
    const now = new Date();
    const diffMs = date - now;
    if (diffMs <= 0) return 'Soon';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
    if (diffMins > 0) return `${diffMins}m`;
    return 'Less than a minute';
  } catch {
    return 'Unknown';
  }
}

function getBarColorClass(percentage) {
  if (percentage >= 90) return 'progress-red';
  if (percentage >= 70) return 'progress-yellow';
  return 'progress-green';
}

function getStatusColor(percentage) {
  if (percentage >= 90) return 'var(--danger)';
  if (percentage >= 70) return 'var(--warning)';
  return 'var(--success)';
}

function getStatusLabel(percentage) {
  if (percentage >= 90) return 'Critical';
  if (percentage >= 70) return 'High usage';
  if (percentage >= 40) return 'Moderate';
  return 'Good';
}

export default function RateLimitBar() {
  const { user } = useAuth();
  const [rateData, setRateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchRateLimit = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getRateLimit();
      setRateData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError('Could not fetch quota');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRateLimit();
  }, [fetchRateLimit]);

  if (!user) return null;

  const used = rateData?.used ?? rateData?.requests_used ?? 0;
  const limit = rateData?.limit ?? rateData?.daily_limit ?? 50;
  const remaining = rateData?.remaining ?? rateData?.requests_remaining ?? (limit - used);
  const resetTime = rateData?.reset_time ?? rateData?.resets_at ?? null;

  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const barClass = getBarColorClass(percentage);
  const statusColor = getStatusColor(percentage);
  const statusLabel = getStatusLabel(percentage);

  return (
    <div
      className="glass-card"
      style={{
        padding: '18px 20px',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'rgba(124,58,237,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-light)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Daily Quota
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchRateLimit}
          disabled={loading}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '5px 8px',
            borderRadius: '7px',
            border: '1px solid rgba(255,255,255,0.07)',
            color: 'var(--text-muted)',
          }}
          title="Refresh quota"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{
              animation: loading ? 'spin 0.8s linear infinite' : 'none',
            }}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {loading && !rateData ? (
        /* Loading skeleton */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="skeleton" style={{ height: '8px', borderRadius: '4px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ height: '12px', width: '60px', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '12px', width: '40px', borderRadius: '4px' }} />
          </div>
        </div>
      ) : error ? (
        /* Error state */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--warning)"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: statusColor,
                lineHeight: 1,
              }}
            >
              {used}
            </span>
            <span
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: 500,
              }}
            >
              / {limit} requests used
            </span>
          </div>

          {/* Progress bar with tooltip */}
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${barClass}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Tooltip */}
            {showTooltip && resetTime && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(20,20,32,0.98)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  whiteSpace: 'nowrap',
                  zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Resets in
                </div>
                <div
                  style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  {formatResetTime(resetTime)}
                </div>
                {/* Arrow */}
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid rgba(255,255,255,0.12)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer stats */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 5px ${statusColor}`,
                }}
              />
              <span style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 600 }}>
                {statusLabel}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {remaining} remaining
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {percentage}%
              </span>
            </div>
          </div>

          {/* Reset time */}
          {resetTime && (
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Resets in {formatResetTime(resetTime)}
              {lastRefreshed && (
                <span style={{ marginLeft: 'auto' }}>
                  Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* Warning for high usage */}
          {percentage >= 80 && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: percentage >= 90 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                border: `1px solid ${percentage >= 90 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                fontSize: '0.75rem',
                color: percentage >= 90 ? 'var(--danger)' : 'var(--warning)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{percentage >= 90 ? '🔴' : '🟡'}</span>
              {percentage >= 90
                ? 'Almost out of daily requests. Quota resets tomorrow.'
                : 'Usage is high. Consider spacing out your queries.'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
