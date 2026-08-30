import React, { useState } from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { modalityAbbr } from '../lib/format';

function Placeholder({ file }) {
  return (
    <div className="stripes-placeholder w-full h-full flex items-center justify-center relative">
      <div className="text-center">
        <div className="eyebrow mb-1 opacity-70">Placeholder</div>
        <div className="font-display text-3xl text-muted">{file.placeholderLabel || 'scan'}</div>
        <div className="font-mono text-[10px] text-faint mt-2">Drop real image to preview</div>
      </div>
    </div>
  );
}

export default function Viewer() {
  const { selected, showHeatmap, setShowHeatmap, results, tweaks, setError } = useStore();
  const file = selected();
  const result = file ? results[file.id] : null;
  const [zoom, setZoom] = useState(1);
  const patientCopy = {
    brain_mri:
      'This is a derived axial brain MRI view. The colored area marks the tumor region used in the longitudinal demo so you can compare how it changes over time.',
    chest_xray:
      "This is a chest X-ray taken from the front. The bright areas are bone (ribs, spine), and the dark areas are air inside your lungs.",
    general:
      'This panel shows the uploaded scan with any optional AI attention overlay drawn on top of it.',
  };

  if (!file) {
    return (
      <div className="flex-1 surface flex items-center justify-center dot-grid" style={{ margin: 16, borderRadius: 10 }}>
        <div className="text-center max-w-sm">
          <div className="eyebrow mb-3">No scan loaded</div>
          <h2 className="font-display text-4xl mb-2">A calmer second opinion.</h2>
          <p className="text-sm text-muted">
            Launch the MRI walkthrough from the left for a zero-setup demo, or drop a CT, MRI, or
            X-ray into the upload panel. First live runs can take up to 60-90 seconds while the
            GPU wakes.
          </p>
        </div>
      </div>
    );
  }

  const downloadPreview = async () => {
    if (!file.preview) return;

    try {
      const response = await fetch(file.preview);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = file.name.replace(/\.[^.]+$/, '');

      link.href = downloadUrl;
      link.download = `${baseName || 'medgamma-preview'}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      setError('Could not download the preview image.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ margin: 16 }}>
      {/* Viewer chrome */}
      <div className="surface overflow-hidden flex flex-col min-h-0">
        {/* toolbar */}
        <div className="hairline h-10 px-3 flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] text-faint">
            {modalityAbbr(file.sampleModality || 'general')} · {file.name}
          </span>
          <div className="grow-1" />
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-xs" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>−</button>
            <span className="font-mono text-[10px] text-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setZoom((z) => Math.min(3, z + 0.1))}>+</button>
          </div>
          <div style={{ width: 1, height: 16, background: 'var(--line)' }} />
          {result?.heatmap && (
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`btn btn-xs ${showHeatmap ? 'chip-active' : ''}`}
              style={showHeatmap ? { background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderColor: 'transparent' } : {}}
            >
              <Icon name="spark" size={11} />
              Heatmap
            </button>
          )}
          <button className="btn btn-ghost btn-xs" onClick={downloadPreview} disabled={!file.preview}>
            <Icon name="download" size={11} />
            Preview PNG
          </button>
        </div>

        {/* image */}
        <div className="flex-1 film relative overflow-hidden">
          {/* corner markers */}
          <div className="absolute top-2 left-2 font-mono text-[10px] text-white/50">R</div>
          <div className="absolute top-2 right-2 font-mono text-[10px] text-white/50">L</div>
          <div className="absolute bottom-2 left-2 font-mono text-[10px] text-white/40">
            kVp 120 · mAs 80 · 2.5mm
          </div>
          <div className="absolute bottom-2 right-2 font-mono text-[10px] text-white/40">
            MedGemma 1.5 · 4B
          </div>

          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `scale(${zoom})`, transition: 'transform .2s ease' }}
          >
            <div className="relative" style={{ width: '70%', aspectRatio: '4/3', maxWidth: '80%' }}>
              {file.preview ? (
                <img src={file.preview} alt="" className="w-full h-full object-contain rounded-sm" />
              ) : (
                <Placeholder file={file} />
              )}

              {/* heatmap overlay */}
              {result?.heatmap && showHeatmap && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-sm mix-blend-screen"
                  style={{
                    background: `radial-gradient(ellipse 40% 30% at 58% 55%,
                      oklch(0.78 0.2 40 / 0.7),
                      oklch(0.65 0.22 25 / 0.45) 40%,
                      transparent 70%),
                      radial-gradient(ellipse 28% 22% at 38% 48%,
                      oklch(0.72 0.18 85 / 0.5),
                      transparent 70%)`,
                  }}
                />
              )}

              {/* ROI box */}
              {result?.heatmap && showHeatmap && (
                <div
                  className="absolute"
                  style={{
                    top: '42%',
                    left: '50%',
                    width: '22%',
                    height: '24%',
                    border: '1px dashed oklch(0.85 0.15 85)',
                  }}
                >
                  <div className="absolute -top-4 left-0 font-mono text-[9px]" style={{ color: 'oklch(0.85 0.15 85)' }}>
                    ROI · 0.87
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tweak view overlay — patient mode gets an "what you're looking at" caption */}
          {tweaks.view === 'patient' && (
            <div
              className="absolute left-4 right-4 bottom-12 p-3 rounded-md"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'white', backdropFilter: 'blur(6px)' }}
            >
              <div className="eyebrow mb-1" style={{ color: 'oklch(0.85 0.06 85)' }}>What you're looking at</div>
              <p className="text-xs leading-relaxed">
                {patientCopy[file.sampleModality] || patientCopy.general}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
