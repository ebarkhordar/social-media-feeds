from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import create_all_tables
from app.routers import events, export, participants, studies

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.environment == "development":
        await create_all_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Open-source platform for social media feed experiments.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(studies.router)
app.include_router(participants.router)
app.include_router(events.router)
app.include_router(export.router)


@app.get("/")
async def root() -> dict:
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
