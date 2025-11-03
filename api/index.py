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
    from mangum import Mangum
    
    # Wrap FastAPI app with Mangum for AWS Lambda/Vercel compatibility
    # Mangum is an ASGI-to-AWS Lambda adapter
    handler = Mangum(app, lifespan="off")
    
except Exception as e:
    # Provide a fallback handler that shows the error
    import traceback
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    
    error_app = FastAPI()
    
    @error_app.get("/{full_path:path}")
    @error_app.post("/{full_path:path}")
    async def error_handler(request: Request, full_path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to initialize application",
                "detail": str(e),
                "type": type(e).__name__,
                "traceback": traceback.format_exc()
            }
        )
    
    from mangum import Mangum
    handler = Mangum(error_app, lifespan="off")

