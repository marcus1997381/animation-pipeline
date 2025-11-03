from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import router


def create_application() -> FastAPI:

    app = FastAPI(
        title=settings.API_TITLE,
        description=settings.API_DESCRIPTION,
        version=settings.API_VERSION,
        debug=settings.DEBUG,
    )
    
    # Configure CORS
    # Convert CORS_ORIGINS string to list
    if settings.CORS_ORIGINS == "*":
        cors_origins = ["*"]
    elif "," in settings.CORS_ORIGINS:
        cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
    else:
        cors_origins = [settings.CORS_ORIGINS] if settings.CORS_ORIGINS else ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(router)
    
    return app


app = create_application()

