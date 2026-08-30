import React from 'react';
import { useStore } from './store/useStore';
import { Icon } from './components/Icon';
import { useTweaksEffect } from './hooks/useTweaks';
import TopBar from './components/TopBar';
import Upload from './components/Upload';
import ModalityPicker from './components/ModalityPicker';
import ContextPanel from './components/ContextPanel';
import GalleryStrip from './components/GalleryStrip';
import Viewer from './components/Viewer';
import AnalysisDrawer from './components/AnalysisDrawer';
import History from './components/History';
import ComparisonView from './components/ComparisonView';
import PDFPreview from './components/PDFPreview';
import TweaksPanel from './components/TweaksPanel';
import DisclaimerModal from './components/DisclaimerModal';
import { getLongitudinalDemoSession, getSamplePack, SAMPLE_PACK_LIST } from './data/sample';
import { deleteUploadedFile } from './utils/api';

const DEMO_AUTOSTART_KEY = 'medgamma.demo.autostart.v1';

function Sidebar() {
  const {
    comparisonMode,
    setComparisonMode,
    setComparisonTarget,
    setComparisonResult,
    setResult,
    generateHeatmap,
    setGenerateHeatmap,
    files,
    addFiles,
    clearSession,
    selectFile,
    setPriorFile,
    setModality,
    setPatientContext,
    setError,
    setActivePane,
  } = useStore();
  const hasFiles = files.length > 0;

  const clearRemoteFiles = async () => {
    const remoteFiles = files.filter((file) => file.serverBacked);
    await Promise.all(
      remoteFiles.map((file) =>
        deleteUploadedFile(file.id).catch(() => {
          setError(`Could not clean up uploaded file ${file.name}.`);
        })
      )
    );
  };

  const loadPack = async (packKey) => {
    const pack = getSamplePack(packKey);
    if (!pack) return;
    await clearRemoteFiles();
    clearSession();
    setComparisonResult(null);
    setComparisonMode(false);
    const added = addFiles(pack.files);
    setModality(pack.modality);
    setPatientContext(pack.patientContext || {});
    if (added[0]) {
      selectFile(added[0].id);
      if (added[0].resultTemplate) setResult(added[0].id, added[0].resultTemplate);
    }
  };

  const loadLongitudinalDemo = async () => {
    const demo = getLongitudinalDemoSession();
    await clearRemoteFiles();
    clearSession();
    const added = addFiles(demo.files);
    const prior = added.find((file) => file.demoRole === 'prior');
    const current = added.find((file) => file.demoRole === 'current');
    setModality(demo.modality);
    setPatientContext(demo.patientContext);
    if (prior?.resultTemplate) setResult(prior.id, prior.resultTemplate);
    if (current?.resultTemplate) setResult(current.id, current.resultTemplate);
    if (current) selectFile(current.id);
    if (prior) setPriorFile(prior.id);
    setComparisonTarget('prior');
    setComparisonResult(demo.comparisonResult);
    setComparisonMode(true);
  };

  const hasGuidedDemoLoaded = files.some((file) => file.demoPair?.key === 'gliodil-539-progression');

  return (
    <aside
      className="shrink-0 flex flex-col gap-3 p-3 overflow-y-auto"
      style={{ width: 320, borderRight: '1px solid var(--line)' }}
    >
      <Upload />

      <button
        className={`btn btn-sm ${hasFiles ? 'btn-ghost' : ''}`}
        onClick={loadLongitudinalDemo}
        style={hasFiles ? {} : { background: 'var(--sunken)' }}
      >
        <Icon name="spark" size={12} />
        {hasGuidedDemoLoaded ? 'Reload MRI walkthrough' : 'Launch MRI walkthrough'}
      </button>

      {!hasFiles && (
        <div className="surface p-3 text-[11px] leading-relaxed text-muted">
          Uses a real rendered baseline and follow-up pair from GliODIL case 539. The guided demo
          opens with both scans, prewritten reports, and interval progression already staged.
        </div>
      )}

      {hasGuidedDemoLoaded && (
        <div className="surface p-3 space-y-2">
          <div className="eyebrow">Walkthrough Loaded</div>
          <div className="text-[11px] text-muted leading-relaxed">
            The follow-up MRI is selected, the prior study is pinned, and compare mode is ready to
            narrate tumor progression without extra setup.
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-xs" onClick={() => setComparisonMode(true)}>
              <Icon name="compare" size={11} />
              Open compare
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => {
                selectFile('gliodil-539-current');
                setComparisonMode(false);
                setActivePane('workspace');
              }}
            >
              <Icon name="eye" size={11} />
              Follow-up report
            </button>
          </div>
        </div>
      )}

      <div className="surface p-3 space-y-2">
        <div className="eyebrow">Try Sample Cases</div>
        <div className="text-[11px] text-muted leading-relaxed">
          These are dataset-derived PNGs exported from `.parquet` and `.nii.gz`, so they load in
          the current app without extra conversion.
        </div>
        <div className="grid gap-2">
          {SAMPLE_PACK_LIST.map((pack) => (
            <button
              key={pack.key}
              className="btn btn-sm btn-ghost justify-between"
              onClick={() => loadPack(pack.key)}
            >
              <span>{pack.label}</span>
              <span className="font-mono text-[10px] text-faint">{pack.count} files</span>
            </button>
          ))}
        </div>
      </div>

      <ModalityPicker />

      {/* Toggles */}
      <div className="surface p-3 space-y-2.5">
        <div className="eyebrow mb-1">Options</div>
        <Row
          label="Attention heatmap"
          hint="Highlight regions the model focused on"
          on={generateHeatmap}
          onChange={setGenerateHeatmap}
        />
        <Row
          label="Comparison mode"
          hint="Compare current vs. prior study"
          on={comparisonMode}
          onChange={setComparisonMode}
        />
      </div>

      <ContextPanel />

      <div className="grow-1" />

      {hasFiles && (
        <button
          className="btn btn-sm btn-ghost"
          onClick={async () => {
            await clearRemoteFiles();
            clearSession();
          }}
        >
          <Icon name="x" size={12} />
          Clear session
        </button>
      )}

      <div className="text-[10px] font-mono text-faint leading-relaxed px-1">
        MedGamma is educational · not for clinical diagnosis.
      </div>
    </aside>
  );
}

function Row({ label, hint, on, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-ink">{label}</div>
        <div className="text-[10px] font-mono text-faint">{hint}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className="shrink-0 relative"
        style={{
          width: 28, height: 16, borderRadius: 999,
          background: on ? 'var(--accent)' : 'var(--line-strong)',
          transition: 'background .15s',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white"
          style={{ width: 12, height: 12, left: on ? 14 : 2, transition: 'left .15s' }}
        />
      </button>
    </div>
  );
}

function ErrorBar() {
  const { error, clearError } = useStore();
  if (!error) return null;
  return (
    <div
      className="px-4 py-2 flex items-center gap-2 text-[12px]"
      style={{ background: 'color-mix(in oklab, var(--danger) 12%, var(--panel))', color: 'var(--danger)', borderBottom: '1px solid var(--line)' }}
    >
      <Icon name="alert" size={13} />
      <span>{error}</span>
      <div className="grow-1" />
      <button className="btn btn-ghost btn-xs" onClick={clearError}>
        Dismiss
      </button>
    </div>
  );
}

export default function App() {
  useTweaksEffect();
  const { activePane } = useStore();
  const files = useStore((state) => state.files);
  const autoloadedRef = React.useRef(false);

  React.useEffect(() => {
    if (autoloadedRef.current || files.length) return;

    const params = new URLSearchParams(window.location.search);
    const forceDemo = ['1', 'true', 'yes'].includes((params.get('demo') || '').toLowerCase());
    const shouldAutoload = forceDemo || !window.localStorage.getItem(DEMO_AUTOSTART_KEY);

    if (!shouldAutoload) return;
    autoloadedRef.current = true;

    const bootstrapDemo = async () => {
      const state = useStore.getState();
      const demo = getLongitudinalDemoSession();
      const added = state.addFiles(demo.files);
      const prior = added.find((file) => file.demoRole === 'prior');
      const current = added.find((file) => file.demoRole === 'current');

      state.setModality(demo.modality);
      state.setPatientContext(demo.patientContext);
      if (prior?.resultTemplate) state.setResult(prior.id, prior.resultTemplate);
      if (current?.resultTemplate) state.setResult(current.id, current.resultTemplate);
      if (current) state.selectFile(current.id);
      if (prior) state.setPriorFile(prior.id);
      state.setComparisonTarget('prior');
      state.setComparisonResult(demo.comparisonResult);
      state.setComparisonMode(true);

      if (!forceDemo) {
        window.localStorage.setItem(DEMO_AUTOSTART_KEY, '1');
      }
    };

    bootstrapDemo();
  }, [files.length]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--paper)' }}>
      <TopBar />
      <ErrorBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0">
          {activePane === 'workspace' && (
            <>
              <div className="flex-1 flex min-h-0">
                <Viewer />
                <AnalysisDrawer />
              </div>
              <GalleryStrip />
            </>
          )}
          {activePane === 'compare' && (
            <>
              <ComparisonView />
              <GalleryStrip />
            </>
          )}
          {activePane === 'history' && <History />}
          {activePane === 'export' && <PDFPreview />}
        </main>
      </div>
      <TweaksPanel />
      <DisclaimerModal />
    </div>
  );
}
