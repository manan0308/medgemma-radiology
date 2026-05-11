import React from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { deleteUploadedFile } from '../utils/api';
import { modalityAbbr, formatBytes, relativeTime } from '../lib/format';

function Thumb({ file, size = 56 }) {
  if (file.preview) {
    return (
      <img
        src={file.preview}
        alt=""
        className="object-cover w-full h-full"
        style={{ filter: 'contrast(1.02)' }}
      />
    );
  }
  return (
    <div className="stripes-placeholder w-full h-full flex items-center justify-center">
      <div className="text-[9px] font-mono text-muted px-1 text-center leading-tight">
        {file.placeholderLabel || file.sampleModality || 'scan'}
      </div>
    </div>
  );
}

export default function GalleryStrip() {
  const {
    files,
    selectedFileId,
    priorFileId,
    selectFile,
    setPriorFile,
    setComparisonResult,
    comparisonTarget,
    removeFile,
    comparisonMode,
    results,
    setError,
  } = useStore();

  if (!files.length) return null;

  return (
    <div className="hairline-t px-4 py-3 flex items-center gap-3 overflow-x-auto shrink-0" style={{ background: 'var(--panel)' }}>
      <div className="eyebrow shrink-0 mr-1">Series · {files.length}</div>
      {files.map((f) => {
        const isCurrent = f.id === selectedFileId;
        const isPrior = f.id === priorFileId;
        const hasResult = !!results[f.id];
        return (
          <button
            key={f.id}
            onClick={() => {
              if (comparisonMode) {
                setComparisonResult(null);
                if (comparisonTarget === 'current') {
                  selectFile(f.id);
                  if (f.id === priorFileId) setPriorFile(selectedFileId && selectedFileId !== f.id ? selectedFileId : null);
                } else if (f.id === selectedFileId) {
                  if (priorFileId) {
                    selectFile(priorFileId);
                    setPriorFile(f.id);
                  }
                } else {
                  setPriorFile(f.id);
                }
              } else {
                selectFile(f.id);
              }
            }}
            className="group shrink-0 relative rounded-md overflow-hidden text-left"
            style={{
              width: 140,
              border: `1px solid ${isCurrent ? 'var(--accent)' : isPrior ? 'var(--accent-ink)' : 'var(--line)'}`,
              boxShadow: isCurrent ? '0 0 0 3px var(--accent-soft)' : 'none',
            }}
          >
            <div className="w-full h-[72px] bg-sunken">
              <Thumb file={f} />
            </div>
            <div className="px-2 py-1.5" style={{ background: 'var(--panel)' }}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] text-muted">
                  {modalityAbbr(f.sampleModality || 'general')}
                </span>
                <span className="text-[9px] text-faint">{relativeTime(f.timestamp)}</span>
              </div>
              <div className="text-[11px] truncate text-ink">{f.name}</div>
            </div>

            {/* badges */}
            {isCurrent && (
              <div
                className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm font-mono text-[9px]"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {comparisonMode ? 'CURRENT' : 'ACTIVE'}
              </div>
            )}
            {isPrior && (
              <div
                className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm font-mono text-[9px]"
                style={{ background: 'var(--accent-ink)', color: 'white' }}
              >
                PRIOR
              </div>
            )}
            {hasResult && !isCurrent && !isPrior && (
              <div
                className="absolute top-1 left-1 px-1 py-0.5 rounded-sm"
                title="Analyzed"
                style={{ background: 'var(--ok)', color: 'white' }}
              >
                <Icon name="check" size={9} />
              </div>
            )}

            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (f.serverBacked) {
                  try {
                    await deleteUploadedFile(f.id);
                  } catch (error) {
                    setError(error?.response?.data?.detail || error?.message || 'Failed to delete uploaded file.');
                  }
                }
                removeFile(f.id);
              }}
              className="absolute top-1 right-1 w-5 h-5 rounded-sm opacity-0 group-hover:opacity-100 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
            >
              <Icon name="x" size={10} />
            </button>
          </button>
        );
      })}
    </div>
  );
}
