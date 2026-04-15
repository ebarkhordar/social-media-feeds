from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "YourFeed Platform"
    environment: str = "development"
    debug: bool = True

    database_url: str = "postgresql+asyncpg://yourfeed:yourfeed@localhost:5432/yourfeed"

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    default_feed_height_px: int = 700
    default_posts_per_study: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
