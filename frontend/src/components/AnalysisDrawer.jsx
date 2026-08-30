import React, { useState } from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { analyzeUploadedFile } from '../utils/api';
import { renderReport, modalityAbbr } from '../lib/format';
import { SAMPLE_REPORT_SIMPLE, SAMPLE_REPORT_TECHNICAL } from '../data/sample';

function TabBar({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-0 hairline">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="px-3 h-9 text-xs font-medium relative"
            style={{
              color: active ? 'var(--ink)' : 'var(--muted)',
            }}
          >
            {o.label}
            {active && (
              <div
                className="absolute left-2 right-2 bottom-0"
                style={{ height: 2, background: 'var(--accent)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function AnalysisDrawer() {
  const {
    selected,
    results,
    analyzing,
    setAnalyzing,
    setResult,
    setError,
    clearError,
    modality,
    patientContext,
    generateHeatmap,
    coldStart,
    setColdStart,
    tweaks,
    setComparisonMode,
    setActivePane,
  } = useStore();
  const file = selected();
  const result = file ? results[file.id] : null;
  const [tab, setTab] = useState(tweaks.view === 'patient' ? 'simple' : 'technical');

  React.useEffect(() => {
    setTab(tweaks.view === 'patient' ? 'simple' : 'technical');
  }, [tweaks.view]);

  const run = async () => {
    if (!file) return;
    clearError();
    setAnalyzing(true);
    setColdStart(true);
    const coldTimer = setTimeout(() => setColdStart(false), 6000);
    try {
      if (file.serverBacked) {
        const r = await analyzeUploadedFile(file.id, {
          mode: 'both',
          modality,
          context: Object.keys(patientContext).length ? patientContext : null,
          generateHeatmap,
        });
        if (r.error) setError(r.error);
        else setResult(file.id, r);
      } else if (!file.file) {
        await new Promise((r) => setTimeout(r, 1800));
        setResult(
          file.id,
          file.resultTemplate || {
            technical: SAMPLE_REPORT_TECHNICAL,
            simple: SAMPLE_REPORT_SIMPLE,
            heatmap: 'demo',
          }
        );
      } else {
        setError('This file is not connected to the backend upload flow.');
      }
    } catch (e) {
      setError(e.message || 'Analysis failed.');
    } finally {
      clearTimeout(coldTimer);
      setColdStart(false);
      setAnalyzing(false);
    }
  };

  if (!file) return null;

  return (
    <aside
      className="shrink-0 surface flex flex-col min-h-0"
      style={{ width: 460, margin: '16px 16px 16px 0', borderRadius: 10 }}
    >
      {/* header */}
      <div className="hairline px-4 py-3 flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="eyebrow mb-1">Analysis</div>
          <div className="font-display text-xl leading-tight">
            {result ? 'Report ready' : analyzing ? 'Thinking…' : 'Not yet analyzed'}
          </div>
          <div className="text-[11px] font-mono text-faint mt-1">
            {modalityAbbr(modality)} prompt · {generateHeatmap ? 'heatmap on' : 'heatmap off'}
            {patientContext.age ? ` · ${patientContext.age}${patientContext.sex || ''}` : ''}
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm shrink-0"
          onClick={run}
          disabled={analyzing}
        >
          {analyzing ? <span className="spin" /> : <Icon name="play" size={12} />}
          {analyzing ? 'Analyzing' : result ? 'Re-run' : 'Analyze'}
        </button>
      </div>

      {/* cold start */}
      {analyzing && coldStart && (
        <div
          className="px-4 py-2.5 text-[11px] font-mono flex items-center gap-2"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}
        >
          <Icon name="info" size={12} />
          Warming GPU (A10G) · first request takes 60–90s
        </div>
      )}

      {/* tabs */}
      <TabBar
        value={tab}
        onChange={setTab}
        options={[
          { id: 'technical', label: 'Radiology report' },
          { id: 'simple', label: 'Plain English' },
          { id: 'findings', label: 'Findings' },
        ]}
      />

      {/* body */}
      <div className="flex-1 overflow-y-auto p-5">
        {!result && !analyzing && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-md flex items-center justify-center mb-3" style={{ background: 'var(--sunken)' }}>
              <Icon name="spark" size={18} />
            </div>
            <div className="text-sm text-muted mb-0.5">Configure context, then analyze.</div>
            <div className="text-[11px] font-mono text-faint">ETA 10–30s warm · 60–90s cold</div>
          </div>
        )}

        {analyzing && !result && (
          <div className="space-y-3 animate-fade-in">
            <div className="skel h-3 w-1/3" />
            <div className="skel h-2.5 w-full" />
            <div className="skel h-2.5 w-11/12" />
            <div className="skel h-2.5 w-4/5" />
            <div className="skel h-3 w-1/4 mt-6" />
            <div className="skel h-2.5 w-full" />
            <div className="skel h-2.5 w-10/12" />
            <div className="skel h-2.5 w-9/12" />
            <div className="skel h-2.5 w-11/12" />
          </div>
        )}

        {result && tab === 'technical' && (
          <div
            className="report text-[13px] leading-[1.6]"
            dangerouslySetInnerHTML={{ __html: renderReport(result.technical) }}
          />
        )}
        {result && tab === 'simple' && (
          <div
            className="report text-[14px] leading-[1.65]"
            dangerouslySetInnerHTML={{ __html: renderReport(result.simple) }}
          />
        )}
        {result && tab === 'findings' && <FindingsList result={result} />}
      </div>

      {/* footer actions */}
      {result && (
        <div className="hairline-t px-4 py-3 flex items-center gap-2 shrink-0">
          <button className="btn btn-sm" onClick={() => setActivePane('export')}>
            <Icon name="download" size={12} />
            PDF
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setComparisonMode(true);
              setActivePane('compare');
            }}
          >
            <Icon name="compare" size={12} />
            Compare to prior
          </button>
          <div className="grow-1" />
          <span className="text-[10px] font-mono text-faint">educational use only</span>
        </div>
      )}
    </aside>
  );
}

function FindingsList({ result }) {
  const findings = result?.findings || [
    { severity: 'ok', label: 'Lungs', value: 'Clear · no consolidation' },
    { severity: 'warn', label: 'Atelectasis', value: 'Mild bibasilar · technique-related' },
    { severity: 'ok', label: 'Pleural spaces', value: 'No effusion, no pneumothorax' },
    { severity: 'ok', label: 'Heart', value: 'Normal cardiomediastinal silhouette' },
    { severity: 'ok', label: 'Bones', value: 'No acute rib fracture' },
    { severity: 'info', label: 'Soft tissues', value: 'Unremarkable' },
  ];
  const sevColor = {
    ok: 'var(--ok)',
    warn: 'oklch(0.72 0.14 85)',
    alert: 'var(--danger)',
    info: 'var(--faint)',
  };
  return (
    <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
      {findings.map((f, i) => (
        <div key={i} className="py-2.5 flex items-start gap-3">
          <span
            className="mt-1.5 shrink-0 rounded-full"
            style={{ width: 6, height: 6, background: sevColor[f.severity] }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-mono text-faint uppercase tracking-wider">{f.label}</div>
            <div className="text-[13px] mt-0.5">{f.value}</div>
          </div>
          <button className="btn btn-ghost btn-xs">
            <Icon name="eye" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
