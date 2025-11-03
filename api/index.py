"""
Vercel serverless function entry point for FastAPI application
"""
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.main import app

# Export the FastAPI app for Vercel's Python runtime
# Vercel's Python runtime supports ASGI apps directly
handler = app

