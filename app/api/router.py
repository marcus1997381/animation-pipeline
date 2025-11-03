from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.config import settings
from pathlib import Path
from typing import Optional
from app.models.sequence import SequenceRequest, SequenceResponse
import logging
from app.core.prompt_processor import create_sequence

logger = logging.getLogger(__name__)

# Resolve root directory - try multiple approaches for robustness
_router_file = Path(__file__)
ROOT = _router_file.parent.parent.parent.resolve()

# Fallback: try current working directory if relative path fails
if not (ROOT / "public").exists() and not (ROOT / "app").exists():
    import os
    cwd = Path(os.getcwd())
    if (cwd / "public").exists() or (cwd / "app").exists():
        ROOT = cwd
    else:
        # Try going up from cwd
        parent_cwd = cwd.parent
        if (parent_cwd / "public").exists() or (parent_cwd / "app").exists():
            ROOT = parent_cwd

PUB_DIR = ROOT / "public"
SHARE_DIR = ROOT / "shared"
ASSETS_DIR = ROOT / "assets"

# Log paths for debugging
logger.info(f"ROOT: {ROOT}")
logger.info(f"PUB_DIR exists: {PUB_DIR.exists()}")
logger.info(f"SHARE_DIR exists: {SHARE_DIR.exists()}")
logger.info(f"ASSETS_DIR exists: {ASSETS_DIR.exists()}")

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/cs; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".atlas": "text/plain; charset=utf-8",
}

router = APIRouter()

# Simple test endpoint that doesn't require any files
@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify routing works"""
    return {"message": "API is working!", "root": str(ROOT)}

def get_content_type(file: Path) -> str:
    ext = file.suffix.lower()
    return MIME_TYPES.get(ext, "application/octet-stream")

def safe_path(base: Path, relative: str) -> Optional[Path]:
    try:
        full_path = (base / relative).resolve()
        base_resolved = base.resolve()
        try:
            if not full_path.is_relative_to(base_resolved):
                return None
        except AttributeError:
            try:
                full_path.relative_to(base_resolved)
            except ValueError:
                return None
        return full_path
    except (ValueError, RuntimeError):
        return None

@router.get("/")
async def serve_index():
    index_path = PUB_DIR / "index.html"
    if not PUB_DIR.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"Public directory not found. ROOT: {ROOT}, PUB_DIR: {PUB_DIR}, CWD: {Path.cwd()}"
        )
    if not index_path.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"Index file not found at {index_path}. Files in public dir: {list(PUB_DIR.iterdir()) if PUB_DIR.exists() else 'dir does not exist'}"
        )
    return FileResponse(
        index_path,
        media_type="text/html; charset=utf-8",
        headers={"Cache-Control": "no-cache"},
    )

@router.get("/health")
@router.get("/api/health")
async def health_check():
    """Health check endpoint that works even if static files are missing"""
    return {
        "status": "healthy",
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "root_dir": str(ROOT),
        "public_dir": str(PUB_DIR),
        "public_exists": PUB_DIR.exists(),
        "cwd": str(Path.cwd())
    }

@router.get("/public/{file_path:path}")
async def serve_public(file_path: str):
    safe_file = safe_path(PUB_DIR, file_path)
    if not safe_file or not safe_file.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if safe_file.is_file():
        return FileResponse(
            safe_file,
            media_type=get_content_type(safe_file),
            headers={"Cache-Control": "no-cache"},
        )
    raise HTTPException(status_code=404, detail="File not found")

@router.get("/shared/{file_path:path}")
async def serve_shared(file_path: str):
    safe_file = safe_path(SHARE_DIR, file_path)
    if not safe_file or not safe_file.exists() or not safe_file.is_file():
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    return FileResponse(
        safe_file,
        media_type=get_content_type(safe_file),
        headers={"Cache-Control": "no-cache"},
    )

@router.get("/assets/{file_path:path}")
async def serve_assets(file_path: str):
    safe_file = safe_path(ASSETS_DIR, file_path)
    if not safe_file or not safe_file.exists() or not safe_file.is_file():
        raise HTTPException(status_code=404, detail=f"Asset not found: {file_path}")
    return FileResponse(
        safe_file,
        media_type=get_content_type(safe_file),
        headers={"Cache-Control": "no-cache"},
    )

@router.post("/api/sequence")
async def generate_sequence(request: SequenceRequest):
    prompt = request.prompt.strip()

    if not prompt:
        raise HTTPException(status_code=400, detail="Missing or empty prompt")
    
    logger.info(f"Processing prompt: {prompt}")
    
    try:
        result = create_sequence(prompt)
        logger.info(f"Created sequence: {result}")
        return SequenceResponse(
            ordered_sequence=result.get("ordered_sequence", ["idle"]),
            vibe=result.get("vibe", "neutral"),
            control_suggestion=result.get("control_suggestion", "auto"),
            inferred_mechanic=result.get("inferred_mechanic"),
            animation_candidates=result.get("animation_candidates")
        )

    except Exception as e:
        logger.error(f"Error processing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")