import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8001';

const API_PREFIX = `${API_BASE_URL}/api`;

function normalizeMediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export async function uploadScans(files, { onProgress } = {}) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const { data } = await axios.post(`${API_PREFIX}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
    timeout: 300000,
  });

  return (data.files || []).map((file) => ({
    id: file.id,
    name: file.filename,
    size: file.size,
    type: file.content_type,
    preview: normalizeMediaUrl(file.preview_url),
    timestamp: file.upload_time ? new Date(file.upload_time).getTime() : Date.now(),
    metadata: file.metadata || null,
    serverBacked: true,
  }));
}

export async function analyzeUploadedFile(fileId, opts = {}) {
  const {
    mode = 'both',
    modality = 'general',
    context = null,
    generateHeatmap = true,
  } = opts;

  const { data } = await axios.post(
    `${API_PREFIX}/analyze`,
    {
      file_ids: [fileId],
      mode,
      modality,
      context,
      generate_heatmap: generateHeatmap,
    },
    {
      timeout: 300000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!data.success) {
    return { error: data.message || 'Analysis failed.' };
  }

  const [result] = data.results || [];
  return result || { error: 'No analysis result returned.' };
}

export async function compareUploadedFiles(currentFileId, priorFileId, opts = {}) {
  const { modality = 'general', context = null } = opts;
  const { data } = await axios.post(
    `${API_PREFIX}/compare`,
    {
      current_file_id: currentFileId,
      prior_file_id: priorFileId,
      modality,
      context,
    },
    {
      timeout: 300000,
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return data;
}

export async function deleteUploadedFile(fileId) {
  await axios.delete(`${API_PREFIX}/images/${fileId}`, { timeout: 30000 });
}

export async function fetchServiceStatus() {
  const { data } = await axios.get(`${API_PREFIX}/status`, { timeout: 10000 });
  return data;
}

export { API_BASE_URL };
