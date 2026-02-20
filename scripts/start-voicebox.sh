#!/bin/bash

# Configuration
VOICEBOX_DIR="/Users/ayanashraf/Documents/anti/voicebox/backend"
PORT=17493

echo "🗣️ Starting AngleTalk Voice Engine (Voicebox)..."

# Check if directory exists
if [ ! -d "$VOICEBOX_DIR" ]; then
    echo "❌ Error: Voicebox backend directory not found at $VOICEBOX_DIR"
    exit 1
fi

cd "$VOICEBOX_DIR"

# Create a virtual environment if it doesn't exist to keep things clean
if [ ! -d "venv" ]; then
    echo "📦 Creating Python 3.12 virtual environment..."
    /opt/homebrew/bin/python3.12 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Install uv for blazing fast dependency resolution
pip install uv

# Install base dependencies
echo "📥 Installing base dependencies with uv..."
uv pip install -r requirements.txt --prerelease=allow

# Install MLX dependencies if on Apple Silicon
if [[ $(uname -m) == 'arm64' && $(uname) == 'Darwin' && -f "requirements-mlx.txt" ]]; then
    echo "🍏 Apple Silicon detected. Installing MLX dependencies with uv..."
    uv pip install -r requirements-mlx.txt --prerelease=allow
fi

# Additional dependencies that might be needed for audio handling and FastAPI
pip install uvicorn fastapi python-multipart

# Clear the port if it's currently occupied
echo "🧹 Cleaning up port $PORT..."
lsof -ti:$PORT | xargs kill -9 2>/dev/null || true

echo "🚀 Booting Voicebox FastAPI Server on port $PORT..."
# Using uvicorn to run the server. We must run from the parent directory to resolve relative imports.
cd ..
backend/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port $PORT --reload
