import React, { useCallback, useRef } from 'react';
import { Icon } from './Icon';
import { useStore } from '../store/useStore';
import { uploadScans } from '../utils/api';

export default function Upload({ compact = false }) {
  const { addFiles, uploading, setUploading, setError, clearError } = useStore();
  const inputRef = useRef(null);

  const handle = useCallback(
    async (files) => {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      clearError();
      setUploading(true, 0);
      try {
        const uploaded = await uploadScans(arr, {
          onProgress: (progress) => setUploading(true, progress),
        });
        addFiles(uploaded);
      } catch (error) {
        setError(error?.response?.data?.detail || error?.message || 'Upload failed.');
      } finally {
        setUploading(false, 0);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [addFiles, clearError, setError, setUploading]
  );

  if (compact) {
    return (
      <button
        className="btn btn-sm btn-primary w-full"
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="plus" size={13} />
        Add scan
        <input
          ref={inputRef}
          hidden
          type="file"
          multiple
          accept="image/*,.dcm,.nii,.nii.gz"
          onChange={(e) => handle(e.target.files)}
        />
      </button>
    );
  }

  return (
    <div
      className="surface p-4"
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.background = 'var(--accent-soft)';
      }}
      onDragLeave={(e) => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background = '';
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background = '';
        handle(e.dataTransfer.files);
      }}
      style={{ transition: 'background .15s, border-color .15s' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow">Upload</div>
        <div className="text-[10px] font-mono text-faint">
          PNG · JPG · DICOM · NIfTI · up to 100MB
        </div>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-md dot-grid"
        style={{ border: '1px dashed var(--line-strong)' }}
      >
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center text-accent"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Icon name="upload" size={16} />
        </div>
        <div className="text-sm">
          <span className="text-ink font-medium">Drop scans</span>
          <span className="text-muted"> or click to browse</span>
        </div>
        <div className="text-[11px] font-mono text-faint">
          {uploading ? 'Uploading to local backend…' : 'single or multi-series'}
        </div>
        <input
          ref={inputRef}
          hidden
          type="file"
          multiple
          accept="image/*,.dcm,.nii,.nii.gz"
          onChange={(e) => handle(e.target.files)}
        />
      </button>
    </div>
  );
}
