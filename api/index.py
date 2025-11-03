"""
Vercel serverless function entry point for FastAPI application
"""
import sys
import os
import traceback
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Store initialization error for debugging
init_error = None
app = None

try:
    # Try to import and initialize the app
    from app.main import app as fastapi_app
    from mangum import Mangum
    
    app = fastapi_app
    
except Exception as e:
    init_error = e
    init_traceback = traceback.format_exc()
    # Create a minimal FastAPI app that shows the error
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    
    error_app = FastAPI(title="Initialization Error")
    
    @error_app.get("/")
    @error_app.get("/{full_path:path}")
    @error_app.post("/{full_path:path}")
    async def error_handler(request: Request, full_path: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to initialize application",
                "detail": str(init_error),
                "type": type(init_error).__name__,
                "traceback": init_traceback,
                "path": str(project_root),
                "python_path": sys.path,
                "cwd": os.getcwd(),
                "env_keys": list(os.environ.keys()) if len(os.environ) < 50 else ["too_many_to_list"]
            }
        )
    
    app = error_app

# Wrap with Mangum for Vercel/Lambda compatibility
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except Exception as e:
    # If mangum fails, create a simple handler
    def handler(event, context):
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": str({
                "error": "Mangum initialization failed",
                "detail": str(e),
                "init_error": str(init_error) if init_error else None
            })
        }

