# MedGamma Radiology

MedGamma is a medical-imaging demo app built around a React frontend, a FastAPI upload/conversion layer, and a Modal-hosted MedGemma inference service.

It is designed for showcase use, not clinical use.

## Current status

- The GitHub repo is live.
- The README URL that previously pointed to `https://medgamma.vercel.app` is stale. I re-checked the URL on August 31, 2026, and it currently returns Vercel `DEPLOYMENT_NOT_FOUND`.
- The app now runs through `frontend -> FastAPI backend -> Modal`. The frontend should point at the backend with `VITE_API_BASE_URL`, not directly at Modal.

## What works in this repo

- Uploads for PNG, JPG, DICOM, and NIfTI
- Backend-side preview generation for dataset formats that browsers cannot open directly
- Single-study analysis through the backend and Modal
- Current-vs-prior comparison through the backend and Modal
- Seeded sample cases for MRI, chest X-ray, and CT
- A preloaded GliODIL longitudinal MRI walkthrough for demos

## Demo flow

On first launch, the app auto-loads a guided brain MRI progression walkthrough using a baseline and follow-up pair derived from `m1balcerak/GliODIL` case 539.

That walkthrough now:

- opens with the follow-up study selected
- pre-seeds both single-study reports
- pre-seeds the interval comparison result
- gives a simple three-step tour through follow-up, baseline, and progression views

You can also force the guided load with `?demo=1`.

## Architecture

```text
React frontend (Vite)
  -> FastAPI backend (/api/upload, /api/analyze, /api/compare, /api/status)
    -> Modal MedGemma inference service
```

Why the backend exists:

- browser uploads need preprocessing and preview generation
- DICOM and NIfTI need conversion before the current UI can display them
- the frontend needs one stable API origin for uploads, previews, status, analysis, and comparison

## Local run

### 1. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Default frontend env:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

### 2. Backend

```bash
pip install -r backend/requirements.txt
cd backend
cp .env.example .env
```

Backend env:

```env
MODAL_ENDPOINT_URL=https://YOUR_MODAL_URL
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
ALLOWED_EXTENSIONS=.dcm,.png,.jpg,.jpeg,.nii,.nii.gz
```

Start the backend:

```bash
cd backend
uvicorn main:app --reload --port 8001
```

### 3. Modal

Accept the MedGemma license on Hugging Face, then:

```bash
pip install modal
modal setup
modal secret create huggingface-secret HF_TOKEN=hf_xxx
modal deploy modal/modal_app.py
```

Copy the deployed Modal URL into `backend/.env` as `MODAL_ENDPOINT_URL`.

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173`.

## Hosted deployment

To make the public demo actually work:

1. Deploy the backend to a public host.
2. Set `MODAL_ENDPOINT_URL` on that backend.
3. Set `CORS_ALLOW_ORIGINS` to include the frontend domain.
4. Set `VITE_API_BASE_URL` on the frontend to the public backend origin.

Example:

```env
# backend
CORS_ALLOW_ORIGINS=https://your-demo.vercel.app

# frontend
VITE_API_BASE_URL=https://your-api.example.com
```

Without those two env vars lined up, the frontend will look offline even if Modal is healthy.

## Model notes

This repo currently loads `google/medgemma-1.5-4b-it` inside Modal.

That is a reasonable demo choice because it is lighter and already supports:

- CT and MRI volume-style tasks
- longitudinal imaging workflows
- chest X-ray reporting

If you want a stronger but heavier upgrade path, the next obvious candidate is `google/medgemma-27b-it`.

If you want classification, retrieval, or similarity search without text generation, Google recommends MedSigLIP instead of MedGemma.

## Important limitation

MedGamma is for educational demos and workflow prototyping only. It is not a medical device and should not be used for diagnosis or treatment decisions.
