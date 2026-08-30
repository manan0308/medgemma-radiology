import React from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { fetchServiceStatus } from '../utils/api';

export default function TopBar() {
  const {
    tweaks,
    setTweak,
    setTweaksOpen,
    tweaksOpen,
    comparisonMode,
    setComparisonMode,
    activePane,
    setActivePane,
    files,
    results,
    selectedFileId,
  } = useStore();
  const [status, setStatus] = React.useState({
    backend_status: 'checking',
    modal_configured: false,
    modal_reachable: false,
  });

  React.useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const next = await fetchServiceStatus();
        if (!cancelled) setStatus(next);
      } catch {
        if (!cancelled) {
          setStatus({
            backend_status: 'offline',
            modal_configured: false,
            modal_reachable: false,
          });
        }
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const statusDot =
    status.backend_status !== 'healthy'
      ? 'var(--danger)'
      : status.modal_reachable
        ? 'var(--ok)'
        : 'oklch(0.72 0.14 85)';

  const statusLabel =
    status.backend_status !== 'healthy'
      ? 'API offline'
      : status.modal_reachable
        ? 'API live · Modal reachable'
        : status.modal_configured
          ? 'API live · Modal waking'
          : 'API live · Modal not configured';

  const canCompare = files.length >= 2;
  const canExport = Boolean(selectedFileId && results[selectedFileId]);

  return (
    <header className="h-14 surface border-0 border-b border-line flex items-center px-4 gap-3 shrink-0" style={{ borderRadius: 0 }}>
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-accent"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Icon name="logo" size={16} />
        </div>
        <div className="leading-none">
          <div className="font-display text-lg">MedGamma</div>
          <div className="eyebrow -mt-px">Radiology intelligence · v1.0</div>
        </div>
      </div>

      {/* Pane switcher */}
      <nav className="ml-6 flex items-center gap-1">
        {[
          { id: 'workspace', label: 'Workspace', icon: 'image' },
          { id: 'compare', label: 'Compare', icon: 'compare' },
          { id: 'history', label: 'History', icon: 'history' },
          { id: 'export', label: 'Export', icon: 'download' },
        ].map((p) => {
          const disabled =
            (p.id === 'compare' && !canCompare) || (p.id === 'export' && !canExport);

          return (
            <button
              key={p.id}
              onClick={() => {
                if (disabled) return;
                setActivePane(p.id);
                if (p.id === 'compare' && !comparisonMode) setComparisonMode(true);
                if (p.id !== 'compare' && comparisonMode) setComparisonMode(false);
              }}
              className={`btn btn-sm ${activePane === p.id ? 'chip-active' : 'btn-ghost'}`}
              style={activePane === p.id ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: 'transparent' } : {}}
              disabled={disabled}
              title={
                p.id === 'compare' && disabled
                  ? 'Load two studies or the MRI walkthrough first.'
                  : p.id === 'export' && disabled
                    ? 'Analyze a study before exporting.'
                    : undefined
              }
            >
              <Icon name={p.icon} size={13} />
              {p.label}
            </button>
          );
        })}
      </nav>

      <div className="grow-1" />

      {/* Status */}
      <div className="flex items-center gap-2 pr-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: statusDot }}
        />
        <span className="eyebrow">{statusLabel}</span>
      </div>

      {/* View toggle */}
      <div className="surface-sunken flex items-center p-0.5 rounded-md">
        {['clinician', 'patient'].map((v) => (
          <button
            key={v}
            onClick={() => setTweak('view', v)}
            className="px-2.5 h-6 text-xs rounded-sm capitalize"
            style={{
              background: tweaks.view === v ? 'var(--panel)' : 'transparent',
              color: tweaks.view === v ? 'var(--ink)' : 'var(--muted)',
              boxShadow: tweaks.view === v ? 'inset 0 0 0 1px var(--line)' : 'none',
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Dark/light */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        <Icon name={tweaks.theme === 'dark' ? 'sun' : 'moon'} size={13} />
      </button>

      {/* Tweaks */}
      <button
        className="btn btn-sm"
        onClick={() => setTweaksOpen(!tweaksOpen)}
      >
        <Icon name="settings" size={13} />
        Tweaks
      </button>
    </header>
  );
}
