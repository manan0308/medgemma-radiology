const GLIODIL_539_PAIR = {
  key: 'gliodil-539-progression',
  caseId: '539',
  source: 'm1balcerak/GliODIL',
  title: 'GliODIL case 539',
  note:
    'Derived longitudinal brain MRI demo using shared tissue maps plus baseline and follow-up lesion masks.',
  priorVolumeMl: 53.75,
  currentVolumeMl: 154.37,
  deltaVolumeMl: 100.62,
  ratio: 2.87,
  trend: 'growth',
  overlayPreview: '/demo/gliodil/case-539-progression/overlay.png',
  comparison: `### Interval change
Marked interval **progression** is visible on the follow-up MRI-derived view, with substantially greater tumor burden than baseline.

### Quantitative summary
- Baseline lesion burden: **53.75 mL**
- Follow-up lesion burden: **154.37 mL**
- Absolute change: **+100.62 mL**
- Relative change: **2.87x larger**

### Impression
1. **Substantial interval increase** in glioma-related abnormal tissue burden.
2. Progression is most conspicuous around the dominant right hemispheric lesion footprint.
3. Showcase note: this demo uses GliODIL-derived tissue maps and lesion masks rather than raw DICOM slices.`,
};

function cannedReport(title, bullets, impression) {
  return {
    technical: `### Examination
Curated showcase image.

### Technique
Dataset-derived PNG exported from a source archive that originally shipped as parquet or NIfTI.

### Findings
${bullets.map((line) => `- ${line}`).join('\n')}

### Impression
${impression.map((line, index) => `${index + 1}. ${line}`).join('\n')}`,
    simple: `${title}

${bullets.join(' ')}

${impression.join(' ')}`,
    findings: bullets.map((line, index) => ({
      severity: index === 0 ? 'info' : 'ok',
      label: `Finding ${index + 1}`,
      value: line,
    })),
  };
}

function buildPriorAnalysis() {
  return {
    technical: `### Examination
Derived longitudinal brain MRI reference view.

### Technique
Axial GliODIL-derived tissue-map background (` + '`t1_wm/t1_gm/t1_csf`' + `) with baseline lesion mask overlay.

### Findings
Baseline tumor burden is visualized along the dominant right hemispheric lesion footprint. Estimated lesion volume is **53.75 mL** on this derived baseline study.

### Impression
1. Baseline pre-treatment / reference tumor burden captured for longitudinal comparison.
2. This panel is intended for demo comparison workflow, not diagnostic interpretation.`,
    simple: `This is the **earlier brain MRI view** in the demo pair.

It shows the tumor region highlighted in blue on top of a grayscale brain background. In this baseline view, the highlighted burden is about **53.75 mL**.

Use this scan as the “prior” study when showing how the follow-up MRI changed over time.`,
    findings: [
      { severity: 'info', label: 'Study role', value: 'Prior / baseline reference MRI view' },
      { severity: 'warn', label: 'Tumor burden', value: '53.75 mL derived lesion volume' },
      { severity: 'info', label: 'Display mode', value: 'GliODIL tissue-map background with baseline mask overlay' },
      { severity: 'ok', label: 'Showcase use', value: 'Good reference for side-by-side interval comparison' },
    ],
  };
}

function buildCurrentAnalysis() {
  return {
    technical: `### Examination
Derived longitudinal brain MRI follow-up view.

### Technique
Axial GliODIL-derived tissue-map background (` + '`t1_wm/t1_gm/t1_csf`' + `) with follow-up lesion mask overlay.

### Findings
Follow-up tumor burden is more extensive than on the baseline demo study. Estimated lesion volume is **154.37 mL**, representing a marked increase versus the paired reference.

### Impression
1. Follow-up study demonstrates **progressive interval increase** in lesion burden.
2. Estimated derived volume is approximately **2.87x** the baseline showcase study.
3. This panel is intended for demo comparison workflow, not diagnostic interpretation.`,
    simple: `This is the **later brain MRI view** in the demo pair.

The orange highlighted region is much larger than in the baseline study. In this derived follow-up view, the tumor burden measures about **154.37 mL**, which is **2.87 times larger** than the earlier scan.

This makes it a strong demo case for showing interval progression.`,
    findings: [
      { severity: 'info', label: 'Study role', value: 'Current / follow-up MRI view' },
      { severity: 'alert', label: 'Tumor burden', value: '154.37 mL derived lesion volume' },
      { severity: 'alert', label: 'Change vs prior', value: '+100.62 mL, approximately 2.87x larger' },
      { severity: 'info', label: 'Display mode', value: 'GliODIL tissue-map background with follow-up mask overlay' },
    ],
  };
}

export function getLongitudinalDemoSession() {
  const now = Date.now();
  return {
    modality: 'brain_mri',
    patientContext: {
      chief_complaint: 'Post-treatment glioma surveillance MRI',
    },
    comparisonResult: {
      comparison: GLIODIL_539_PAIR.comparison,
    },
    files: [
      {
        id: 'gliodil-539-prior',
        name: 'GliODIL-539-prior-derived.png',
        size: 412_000,
        type: 'image/png',
        preview: '/demo/gliodil/case-539-progression/prior.png',
        placeholderLabel: 'MRI · Brain · Prior',
        sampleModality: 'brain_mri',
        timestamp: now - 1000 * 60 * 60 * 24 * 120,
        demoRole: 'prior',
        demoPair: GLIODIL_539_PAIR,
        resultTemplate: buildPriorAnalysis(),
      },
      {
        id: 'gliodil-539-current',
        name: 'GliODIL-539-followup-derived.png',
        size: 428_000,
        type: 'image/png',
        preview: '/demo/gliodil/case-539-progression/current.png',
        placeholderLabel: 'MRI · Brain · Follow-up',
        sampleModality: 'brain_mri',
        timestamp: now - 1000 * 60 * 60 * 24 * 7,
        demoRole: 'current',
        demoPair: GLIODIL_539_PAIR,
        resultTemplate: buildCurrentAnalysis(),
      },
    ],
  };
}

const SAMPLE_PACKS = {
  brain_mri: {
    label: 'Brain MRI PNGs',
    modality: 'brain_mri',
    patientContext: {
      chief_complaint: 'Brain tumor showcase set',
    },
    files: [
      {
        id: 'pack-mri-prior',
        name: 'gliodil-539-prior.png',
        size: 164_000,
        type: 'image/png',
        preview: '/loadable-samples/brain-mri/gliodil-539-prior.png',
        placeholderLabel: 'MRI · Brain · Prior',
        sampleModality: 'brain_mri',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 120,
        resultTemplate: cannedReport(
          'Earlier brain MRI demo view.',
          [
            'Blue overlay marks baseline tumor burden for GliODIL case 539.',
            'Derived lesion burden is smaller than the follow-up progression view.',
          ],
          [
            'Good prior study for longitudinal compare mode.',
            'Derived showcase image only, not a diagnostic DICOM slice.',
          ]
        ),
      },
      {
        id: 'pack-mri-current',
        name: 'gliodil-539-followup.png',
        size: 172_000,
        type: 'image/png',
        preview: '/loadable-samples/brain-mri/gliodil-539-current.png',
        placeholderLabel: 'MRI · Brain · Follow-up',
        sampleModality: 'brain_mri',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 7,
        resultTemplate: cannedReport(
          'Later brain MRI demo view.',
          [
            'Orange overlay marks larger follow-up tumor burden for GliODIL case 539.',
            'This sample is useful for showing visible interval progression.',
          ],
          [
            'Marked increase compared with the paired prior view.',
            'Derived showcase image only, not a diagnostic DICOM slice.',
          ]
        ),
      },
      {
        id: 'pack-mri-glioma',
        name: 'aio-glioma.png',
        size: 96_000,
        type: 'image/png',
        preview: '/loadable-samples/brain-mri/glioma.png',
        placeholderLabel: 'MRI · Glioma',
        sampleModality: 'brain_mri',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
        resultTemplate: cannedReport(
          'Glioma sample exported from parquet.',
          [
            'Parquet-backed brain MRI image converted to plain PNG.',
            'Useful for verifying the app can load dataset-derived MRI without extra preprocessing.',
          ],
          [
            'Loadable through the current UI.',
            'Converted from AIOmarRehan/Brain_Tumor_MRI_Dataset.',
          ]
        ),
      },
      {
        id: 'pack-mri-meningioma',
        name: 'aio-meningioma.png',
        size: 94_000,
        type: 'image/png',
        preview: '/loadable-samples/brain-mri/meningioma.png',
        placeholderLabel: 'MRI · Meningioma',
        sampleModality: 'brain_mri',
        timestamp: Date.now() - 1000 * 60 * 60 * 24 * 2,
        resultTemplate: cannedReport(
          'Meningioma sample exported from parquet.',
          [
            'Dataset image was originally stored in parquet and converted to browser-loadable PNG.',
            'Useful as a second tumor-class MRI example.',
          ],
          [
            'Good fallback sample if you do not want the longitudinal pair.',
            'Converted from AIOmarRehan/Brain_Tumor_MRI_Dataset.',
          ]
        ),
      },
    ],
  },
  chest_xray: {
    label: 'Chest X-ray PNGs',
    modality: 'chest_xray',
    patientContext: {
      chief_complaint: 'Chest radiograph showcase set',
    },
    files: [
      {
        id: 'pack-cxr-normal',
        name: 'cxr-normal.png',
        size: 138_000,
        type: 'image/png',
        preview: '/loadable-samples/chest-xray/normal.png',
        placeholderLabel: 'CXR · Normal',
        sampleModality: 'chest_xray',
        timestamp: Date.now() - 1000 * 60 * 60 * 18,
        resultTemplate: cannedReport(
          'Normal chest X-ray sample.',
          [
            'Parquet-backed chest X-ray converted to PNG.',
            'No comparison setup required; useful for a quick single-image smoke test.',
          ],
          [
            'Straightforward sample for basic app validation.',
            'Converted from hf-vision/chest-xray-pneumonia.',
          ]
        ),
      },
      {
        id: 'pack-cxr-pneumonia',
        name: 'cxr-pneumonia.png',
        size: 140_000,
        type: 'image/png',
        preview: '/loadable-samples/chest-xray/pneumonia.png',
        placeholderLabel: 'CXR · Pneumonia',
        sampleModality: 'chest_xray',
        timestamp: Date.now() - 1000 * 60 * 60 * 12,
        resultTemplate: cannedReport(
          'Pneumonia chest X-ray sample.',
          [
            'Dataset image was originally stored in parquet and converted to PNG.',
            'Useful if you want an abnormal X-ray example in the current uploader.',
          ],
          [
            'Loadable without touching the parquet shard directly.',
            'Converted from hf-vision/chest-xray-pneumonia.',
          ]
        ),
      },
    ],
  },
  chest_ct: {
    label: 'Chest CT PNGs',
    modality: 'general',
    patientContext: {
      chief_complaint: 'Chest CT showcase set',
    },
    files: [
      {
        id: 'pack-ct-normal',
        name: 'ct-normal.png',
        size: 112_000,
        type: 'image/png',
        preview: '/loadable-samples/chest-ct/normal.png',
        placeholderLabel: 'CT · Chest · Normal',
        sampleModality: 'general',
        timestamp: Date.now() - 1000 * 60 * 60 * 10,
        resultTemplate: cannedReport(
          'Normal chest CT slice.',
          [
            'Plain PNG slice copied from the downloaded CT dataset.',
            'Useful for validating that CT-like imagery displays correctly in the current app.',
          ],
          [
            'Current app can show this immediately because it is already a PNG.',
            'Converted from Mahadih534/Chest_CT-Scan_images-Dataset.',
          ]
        ),
      },
      {
        id: 'pack-ct-adeno',
        name: 'ct-adenocarcinoma.png',
        size: 114_000,
        type: 'image/png',
        preview: '/loadable-samples/chest-ct/adenocarcinoma.png',
        placeholderLabel: 'CT · Chest · Adenocarcinoma',
        sampleModality: 'general',
        timestamp: Date.now() - 1000 * 60 * 60 * 9,
        resultTemplate: cannedReport(
          'Chest CT adenocarcinoma sample.',
          [
            'Downloaded CT slice that is already loadable in the UI.',
            'Handy abnormal CT example without any NIfTI conversion step.',
          ],
          [
            'Best used with the general prompt today.',
            'Converted from Mahadih534/Chest_CT-Scan_images-Dataset.',
          ]
        ),
      },
      {
        id: 'pack-ct-squamous',
        name: 'ct-squamous.png',
        size: 116_000,
        type: 'image/png',
        preview: '/loadable-samples/chest-ct/squamous.png',
        placeholderLabel: 'CT · Chest · Squamous',
        sampleModality: 'general',
        timestamp: Date.now() - 1000 * 60 * 60 * 8,
        resultTemplate: cannedReport(
          'Chest CT squamous carcinoma sample.',
          [
            'Additional abnormal CT slice for broader showcase coverage.',
            'Useful when you want more than one CT disease example in the current UI.',
          ],
          [
            'Loadable immediately as a PNG.',
            'Converted from Mahadih534/Chest_CT-Scan_images-Dataset.',
          ]
        ),
      },
    ],
  },
};

export function getSamplePack(key) {
  const pack = SAMPLE_PACKS[key];
  if (!pack) return null;
  return {
    ...pack,
    files: pack.files.map((file) => ({ ...file })),
  };
}

export const SAMPLE_PACK_LIST = Object.entries(SAMPLE_PACKS).map(([key, value]) => ({
  key,
  label: value.label,
  modality: value.modality,
  count: value.files.length,
}));

export const SAMPLE_HISTORY = [
  {
    id: 'h1',
    fileName: 'CXR-PA-UPRIGHT.png',
    placeholderLabel: 'CXR · PA · Upright',
    modality: 'chest_xray',
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    hasHeatmap: true,
    snippet: 'No acute cardiopulmonary process. Mild bibasilar atelectasis.',
  },
  {
    id: 'h2',
    fileName: 'BRAIN-MRI-T2-AXIAL.png',
    placeholderLabel: 'MRI · Brain · T2 axial',
    modality: 'brain_mri',
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
    hasHeatmap: true,
    snippet: 'Small vessel chronic ischemic change. No acute infarct.',
  },
  {
    id: 'h3',
    fileName: 'KNEE-MRI-SAG-PD.png',
    placeholderLabel: 'MRI · Knee · Sag PD',
    modality: 'msk',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    hasHeatmap: false,
    snippet: 'Grade 2 MCL sprain. Small joint effusion.',
  },
  {
    id: 'h4',
    fileName: 'CT-ABDO-PORTAL-VENOUS.dcm',
    placeholderLabel: 'CT · Abdomen · Portal venous',
    modality: 'ct_abdomen',
    timestamp: Date.now() - 1000 * 60 * 60 * 120,
    hasHeatmap: true,
    snippet: 'Hepatic steatosis. No focal lesion. Stable renal cyst.',
  },
];

export const SAMPLE_REPORT_TECHNICAL = `### Examination
Chest radiograph, PA and lateral projections, upright.

### Clinical history
45-year-old male with persistent cough × 2 weeks. Smoker, known hypertension.

### Technique
Adequate inspiratory effort. Mild rotation to the left. Penetration appropriate.

### Findings
**Airway**  Trachea midline. Carina sharp.
**Breathing**  Lungs are clear without consolidation, effusion, or pneumothorax. No focal airspace opacity. *Mild bibasilar atelectasis* likely related to suboptimal inspiration.
**Cardiac**  Cardiomediastinal silhouette within normal limits. No widening of the mediastinum.
**Diaphragm**  Costophrenic angles sharp bilaterally. No subdiaphragmatic free air.
**Everything else**  Osseous structures unremarkable. No acute rib fracture. Soft tissues intact.

### Impression
1. **No acute cardiopulmonary process.**
2. Mild bibasilar atelectasis — likely technique-related.
3. Cardiomediastinal contours within normal limits.

### Recommendations
If symptoms persist beyond 3 weeks or new findings develop, consider CT chest for further characterization.`;

export const SAMPLE_REPORT_SIMPLE = `Your chest X-ray looks reassuring.

**What we looked at**  We checked your lungs, your heart's outline, and the bones of your chest to make sure nothing stood out.

**What we found**  Your lungs are clear — there's no sign of pneumonia, a collapsed lung, or fluid build-up. The bottom parts of your lungs look a little less inflated than ideal, which usually just means you didn't take as deep a breath as possible when the picture was taken. It's not a problem.

**What it means for you**  Nothing on this image needs urgent attention. If your cough continues past another week or two, or you develop fever or chest pain, your doctor may want a follow-up scan.`;
