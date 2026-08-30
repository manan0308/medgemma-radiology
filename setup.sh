#!/bin/bash

# MedGamma Setup Script
# Run this after cloning the repository

set -e

echo "=================================="
echo "  MedGamma - Setup"
echo "=================================="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3 is required."; exit 1; }

echo "[1/5] Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..

echo "[2/5] Installing backend and Modal dependencies..."
pip install -r backend/requirements.txt modal --quiet

echo "[3/5] Checking Modal authentication..."
if ! modal token show >/dev/null 2>&1; then
    echo ""
    echo "Modal not authenticated. Running 'modal setup'..."
    echo "This will open a browser window."
    echo ""
    modal setup
fi

echo ""
echo "[4/5] Preparing env examples..."
if [ ! -f frontend/.env.local ]; then
    cp frontend/.env.example frontend/.env.local
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
fi

echo ""
echo "[5/5] Setup complete!"
echo ""
echo "=================================="
echo "  Next Steps"
echo "=================================="
echo ""
echo "1. Accept MedGemma license:"
echo "   https://huggingface.co/google/medgemma-1.5-4b-it"
echo ""
echo "2. Create HuggingFace secret in Modal:"
echo "   modal secret create huggingface-secret HF_TOKEN=hf_your_token"
echo ""
echo "3. Deploy Modal endpoint:"
echo "   modal deploy modal/modal_app.py"
echo ""
echo "4. Configure backend/.env:"
echo "   MODAL_ENDPOINT_URL=https://YOUR_MODAL_URL"
echo "   CORS_ALLOW_ORIGINS=http://localhost:5173"
echo ""
echo "5. Start the backend:"
echo "   cd backend && uvicorn main:app --reload --port 8001"
echo ""
echo "6. Point the frontend at the backend:"
echo "   echo 'VITE_API_BASE_URL=http://127.0.0.1:8001' > frontend/.env.local"
echo ""
echo "7. Start the frontend:"
echo "   cd frontend && npm run dev"
echo ""
