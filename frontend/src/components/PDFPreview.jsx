import React from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { modalityAbbr, modalityLabel, renderReport } from '../lib/format';

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative shrink-0"
      style={{
        width: 28,
        height: 16,
        borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--line-strong)',
        transition: 'background .15s',
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white"
        style={{
          width: 12,
          height: 12,
          left: checked ? 14 : 2,
          transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function buildExportText({ file, modality, patientContext, technical, simple, options }) {
  const parts = [
    'MedGamma AI-assisted radiology report',
    `Exam: ${file ? file.placeholderLabel || file.name : 'Unknown study'}`,
    `Modality: ${modalityLabel(modality)} (${modalityAbbr(modality)})`,
  ];

  if (options.context) {
    parts.push(
      `Patient context: ${patientContext.chief_complaint || 'Not provided'}${
        patientContext.age || patientContext.sex
          ? ` | ${patientContext.age || 'Age ?'}${patientContext.sex ? ` | ${patientContext.sex}` : ''}`
          : ''
      }`
    );
  }

  if (options.technical && technical) {
    parts.push('Radiology report');
    parts.push(technical);
  }

  if (options.simple && simple) {
    parts.push('Plain-English summary');
    parts.push(simple);
  }

  parts.push('Educational use only. Not for clinical diagnosis.');

  return parts.join('\n\n');
}

export default function PDFPreview() {
  const { selected, results, patientContext, modality, setError, clearError } = useStore();
  const file = selected();
  const result = file ? results[file.id] : null;
  const [options, setOptions] = React.useState({
    technical: true,
    simple: true,
    thumbnail: true,
    context: true,
  });
  const reportIdRef = React.useRef(`MG-${Date.now().toString(36).toUpperCase().slice(-8)}`);

  const toggle = (key, value) => {
    setOptions((current) => ({ ...current, [key]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    if (!result) return;

    clearError();
    try {
      await navigator.clipboard.writeText(
        buildExportText({
          file,
          modality,
          patientContext,
          technical: result.technical || '',
          simple: result.simple || '',
          options,
        })
      );
    } catch {
      setError('Could not copy the report text.');
    }
  };

  if (!result) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        <div className="surface max-w-lg p-6 text-center">
          <div className="eyebrow mb-2">Export</div>
          <h1 className="font-display text-3xl leading-tight mb-2">No report to export yet.</h1>
          <p className="text-sm text-muted leading-relaxed">
            Analyze a scan or launch the MRI walkthrough first. Export becomes available only once
            the session has a real report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex">
      <div
        className="shrink-0 flex flex-col gap-3 p-6"
        style={{ width: 260, borderRight: '1px solid var(--line)' }}
      >
        <div className="eyebrow">Export</div>
        <h1 className="font-display text-3xl leading-none">Clinical report</h1>
        <p className="text-sm text-muted">
          Print this page to save a PDF, or copy the staged report text for your demo notes.
        </p>

        <div className="surface-sunken p-3 space-y-2 mt-2">
          <label className="flex items-center justify-between text-xs">
            <span>Include technical report</span>
            <Toggle checked={options.technical} onChange={(value) => toggle('technical', value)} />
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>Include patient summary</span>
            <Toggle checked={options.simple} onChange={(value) => toggle('simple', value)} />
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>Include study thumbnail</span>
            <Toggle checked={options.thumbnail} onChange={(value) => toggle('thumbnail', value)} />
          </label>
          <label className="flex items-center justify-between text-xs">
            <span>Include patient context</span>
            <Toggle checked={options.context} onChange={(value) => toggle('context', value)} />
          </label>
        </div>

        <button className="btn btn-primary btn-sm mt-2" onClick={handlePrint}>
          <Icon name="download" size={12} />
          Print / Save PDF
        </button>
        <button className="btn btn-sm" onClick={handleCopy}>
          <Icon name="file" size={12} />
          Copy report text
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-10" style={{ background: 'var(--sunken)' }}>
        <div
          className="mx-auto bg-panel shadow-lift"
          style={{ width: 760, minHeight: 1050, padding: '56px 64px', border: '1px solid var(--line)' }}
        >
          <div className="flex items-start justify-between pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-accent"
                  style={{ background: 'var(--accent-soft)' }}
                >
                  <Icon name="logo" size={14} />
                </div>
                <div className="font-display text-xl">MedGamma</div>
              </div>
              <div className="eyebrow">AI-assisted radiology report</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] text-muted">REPORT ID</div>
              <div className="font-mono text-[11px]">{reportIdRef.current}</div>
              <div className="font-mono text-[10px] text-muted mt-2">{new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 py-4 text-xs" style={{ borderBottom: '1px solid var(--line)' }}>
            <div>
              <div className="eyebrow mb-1">Exam</div>
              <div>{file ? file.placeholderLabel || file.name : 'Unknown study'}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Modality</div>
              <div className="font-mono">{modalityAbbr(modality)}</div>
            </div>
            <div>
              <div className="eyebrow mb-1">Patient</div>
              <div>
                {patientContext.age
                  ? `${patientContext.age}${patientContext.sex ? ' · ' + patientContext.sex : ''}`
                  : '— / —'}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Indication</div>
              <div className="truncate">{patientContext.chief_complaint || 'Not provided'}</div>
            </div>
          </div>

          {options.thumbnail && file?.preview && (
            <div className="py-6" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="eyebrow mb-3">Study thumbnail</div>
              <img
                src={file.preview}
                alt={file.name}
                className="w-full max-h-[280px] object-contain rounded-md"
                style={{ background: 'var(--sunken)' }}
              />
            </div>
          )}

          {options.context && (
            <div className="py-6" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="eyebrow mb-3">Patient context</div>
              <div className="grid gap-3 text-[12px] sm:grid-cols-2">
                <div>
                  <div className="text-faint font-mono text-[10px] mb-1">Chief complaint</div>
                  <div>{patientContext.chief_complaint || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-faint font-mono text-[10px] mb-1">Duration</div>
                  <div>{patientContext.duration || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-faint font-mono text-[10px] mb-1">Relevant history</div>
                  <div>{patientContext.history?.join(', ') || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-faint font-mono text-[10px] mb-1">Associated symptoms</div>
                  <div>{patientContext.symptoms?.join(', ') || 'Not provided'}</div>
                </div>
              </div>
            </div>
          )}

          {options.technical && (
            <div className="py-6">
              <div className="eyebrow mb-3">Radiology report</div>
              <div
                className="report text-[12px] leading-[1.55]"
                dangerouslySetInnerHTML={{ __html: renderReport(result.technical || '') }}
              />
            </div>
          )}

          {options.simple && (
            <div className="py-6" style={{ borderTop: options.technical ? '1px solid var(--line)' : 'none' }}>
              <div className="eyebrow mb-3">For the patient</div>
              <div
                className="report text-[12px] leading-[1.55]"
                dangerouslySetInnerHTML={{ __html: renderReport(result.simple || '') }}
              />
            </div>
          )}

          <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="text-[10px] font-mono text-faint leading-relaxed">
              Generated by MedGamma using MedGemma. This report is AI-assisted and intended for
              educational review only. Not a substitute for professional medical judgement. Always
              consult a qualified radiologist before clinical action.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
