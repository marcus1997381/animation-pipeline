"""Application configuration and settings"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    API_TITLE: str = "Animation API"
    API_DESCRIPTION: str = "API for animation services"
    API_VERSION: str = "1.0.0"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 3333
    DEBUG: bool = True
    
    # CORS Settings
    CORS_ORIGINS: list[str] = ["*"]
    
    # OpenAI Settings
    OPENAI_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = "utf-8"


settings = Settings()

