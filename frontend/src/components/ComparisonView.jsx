import React from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { compareUploadedFiles } from '../utils/api';
import { modalityAbbr, renderReport } from '../lib/format';

const SAMPLE_COMPARISON = `### Interval changes
The right lower lobe consolidation seen on the prior exam has *decreased* in extent and opacity, consistent with **improving pneumonia**.

### Stable findings
- Cardiomediastinal silhouette unchanged
- No new pleural effusion or pneumothorax
- Osseous structures stable

### Impression
1. **Interval improvement** of right lower lobe pneumonia.
2. No new acute cardiopulmonary process.
3. Continue current therapy. Follow-up CXR in 4–6 weeks if clinically indicated.`;

function Pane({ role, file, active, onActivate }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="flex-1 surface overflow-hidden flex flex-col text-left"
      style={{
        boxShadow: active ? '0 0 0 2px var(--accent-soft)' : 'none',
      }}
    >
      <div className="hairline px-3 h-9 flex items-center gap-2 shrink-0">
        <span
          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
          style={{
            background: role === 'current' ? 'var(--accent)' : 'var(--accent-ink)',
            color: 'white',
          }}
        >
          {role.toUpperCase()}
        </span>
        <span className="font-mono text-[10px] text-muted truncate">
          {file ? `${modalityAbbr(file.sampleModality || 'general')} · ${file.name}` : 'select a series'}
        </span>
        {active && (
          <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--accent-ink)' }}>
            picking from strip
          </span>
        )}
      </div>
      <div className="flex-1 film relative">
        {file ? (
          file.preview ? (
            <img src={file.preview} alt="" className="w-full h-full object-contain" />
          ) : (
            <div className="stripes-placeholder w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="eyebrow mb-1 opacity-70">Placeholder</div>
                <div className="font-display text-2xl text-muted">{file.placeholderLabel}</div>
              </div>
            </div>
          )
        ) : (
            <div className="w-full h-full flex items-center justify-center">
            <div className="eyebrow text-faint">pick a series from the strip below</div>
          </div>
        )}
      </div>
    </button>
  );
}

function getPairDemoMeta(current, prior) {
  if (!current?.demoPair || !prior?.demoPair) return null;
  return current.demoPair.key === prior.demoPair.key ? current.demoPair : null;
}

function StatChip({ label, value }) {
  return (
    <div className="surface-sunken rounded-md px-2.5 py-2 min-w-[92px]">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-[13px] text-ink">{value}</div>
    </div>
  );
}

export default function ComparisonView() {
  const {
    selected,
    prior,
    comparisonTarget,
    setComparisonTarget,
    setComparing,
    setComparisonResult,
    comparisonResult,
    comparing,
    modality,
    patientContext,
    setError,
    clearError,
  } = useStore();
  const current = selected();
  const p = prior();
  const demoPair = getPairDemoMeta(current, p);

  const run = async () => {
    if (!current || !p) return;
    clearError();
    setComparing(true);
    try {
      if (current.serverBacked && p.serverBacked) {
        const r = await compareUploadedFiles(current.id, p.id, {
          modality,
          context: Object.keys(patientContext).length ? patientContext : null,
        });
        if (r.error) setError(r.error);
        else setComparisonResult(r);
      } else if (!current.serverBacked && !p.serverBacked) {
        await new Promise((r) => setTimeout(r, 1600));
        setComparisonResult({ comparison: demoPair?.comparison || SAMPLE_COMPARISON });
      } else {
        setError('Please compare two uploaded studies or two demo studies, not a mix of both.');
      }
    } catch (e) {
      setError(e.message || 'Comparison failed.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col p-4 gap-4">
      {/* header */}
      <div className="surface px-4 py-3 flex items-center gap-4">
        <div>
          <div className="eyebrow">Comparison</div>
          <div className="font-display text-xl">Current vs. prior</div>
        </div>
        <div className="surface-sunken flex items-center p-0.5 rounded-md">
          {['prior', 'current'].map((slot) => (
            <button
              key={slot}
              onClick={() => setComparisonTarget(slot)}
              className="px-2.5 h-7 text-xs rounded-sm capitalize"
              style={{
                background: comparisonTarget === slot ? 'var(--panel)' : 'transparent',
                color: comparisonTarget === slot ? 'var(--ink)' : 'var(--muted)',
                boxShadow: comparisonTarget === slot ? 'inset 0 0 0 1px var(--line)' : 'none',
              }}
            >
              Pick {slot}
            </button>
          ))}
        </div>
        <div className="grow-1" />
        <div className="text-[11px] font-mono text-faint">
          Pick which slot you are filling, then choose a series from the strip below.
        </div>
        <button
          className="btn btn-primary btn-sm"
          disabled={!current || !p || comparing}
          onClick={run}
        >
          {comparing ? <span className="spin" /> : <Icon name="compare" size={12} />}
          {comparing ? 'Comparing' : 'Run comparison'}
        </button>
      </div>

      {demoPair && (
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="flex flex-wrap gap-2">
            <StatChip label="Case" value={`GliODIL ${demoPair.caseId}`} />
            <StatChip label="Baseline" value={`${demoPair.priorVolumeMl.toFixed(2)} mL`} />
            <StatChip label="Follow-up" value={`${demoPair.currentVolumeMl.toFixed(2)} mL`} />
            <StatChip label="Delta" value={`+${demoPair.deltaVolumeMl.toFixed(2)} mL`} />
            <StatChip label="Change" value={`${demoPair.ratio.toFixed(2)}x ${demoPair.trend}`} />
          </div>
          <div className="surface p-2">
            <img
              src={demoPair.overlayPreview}
              alt={`Overlay preview for ${demoPair.title}`}
              className="w-full aspect-[4/3] object-cover rounded"
            />
            <div className="text-[10px] font-mono text-faint mt-2">{demoPair.note}</div>
          </div>
        </div>
      )}

      {/* panes */}
      <div className="flex-1 flex gap-4 min-h-0">
        <Pane
          role="prior"
          file={p}
          active={comparisonTarget === 'prior'}
          onActivate={() => setComparisonTarget('prior')}
        />
        <Pane
          role="current"
          file={current}
          active={comparisonTarget === 'current'}
          onActivate={() => setComparisonTarget('current')}
        />
      </div>

      {/* result */}
      {comparisonResult && (
        <div className="surface p-5 max-h-[34%] overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="eyebrow">Interval analysis</div>
            <span className="grow-1 divider-dotted" />
          </div>
          <div
            className="report text-[13px] leading-[1.6]"
            dangerouslySetInnerHTML={{ __html: renderReport(comparisonResult.comparison) }}
          />
        </div>
      )}
    </div>
  );
}
