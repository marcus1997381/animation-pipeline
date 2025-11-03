"""
Vercel serverless function entry point for FastAPI application
"""
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from app.main import app
    
    # Export the FastAPI app for Vercel's Python runtime
    # Vercel's Python runtime supports ASGI apps directly
    handler = app
    
except Exception as e:
    # Provide a fallback handler that shows the error
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    error_app = FastAPI()
    
    @error_app.exception_handler(Exception)
    async def error_handler(request, exc):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to initialize application",
                "detail": str(e),
                "type": type(e).__name__
            }
        )
    
    handler = error_app

