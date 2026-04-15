"""Pydantic request/response schemas that are not SQLModel table models."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.event import EventType
from app.models.study import SortAlgorithm


# ---------- Post ----------
class PostIn(BaseModel):
    external_id: str
    author: str
    handle: str
    avatar_color: str = "#1DA1F2"
    text: str
    timestamp_label: str = "1h"
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    category: str | None = None
    topic: str | None = None
    sentiment: float | None = None
    attributes: dict = Field(default_factory=dict)


class PostOut(PostIn):
    id: UUID
    study_id: UUID


# ---------- Condition ----------
class ConditionIn(BaseModel):
    name: str
    label: str
    algorithm: SortAlgorithm = SortAlgorithm.DEFAULT
    algorithm_params: dict = Field(default_factory=dict)
    weight: int = 1


class ConditionOut(ConditionIn):
    id: UUID
    study_id: UUID


# ---------- Study ----------
class StudyIn(BaseModel):
    name: str
    description: str | None = None
    redirect_url: str | None = None
    skin: str = "twitter"
    feed_height_px: int = 700
    conditions: list[ConditionIn] = Field(default_factory=list)
    posts: list[PostIn] = Field(default_factory=list)


class StudyOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    redirect_url: str | None
    skin: str
    feed_height_px: int
    is_active: bool
    conditions: list[ConditionOut]


class StudySummary(BaseModel):
    id: UUID
    name: str
    created_at: datetime
    is_active: bool
    participant_count: int
    condition_count: int
    post_count: int


# ---------- Participant / session ----------
class SessionStartIn(BaseModel):
    participant_external_id: str
    url_params: dict = Field(default_factory=dict)
    user_agent: str | None = None


class FeedPost(BaseModel):
    external_id: str
    author: str
    handle: str
    avatar_color: str
    text: str
    timestamp_label: str
    likes: int
    retweets: int
    replies: int
    sentiment: float | None = None
    position: int


class SessionStartOut(BaseModel):
    participant_id: UUID
    study_id: UUID
    study_name: str
    condition_id: UUID
    condition_label: str
    condition_name: str
    algorithm: SortAlgorithm
    skin: str
    feed_height_px: int
    redirect_url: str | None
    posts: list[FeedPost]


class SessionEndIn(BaseModel):
    participant_id: UUID


# ---------- Events ----------
class EventIn(BaseModel):
    event_type: EventType
    client_timestamp_ms: int
    post_external_id: str | None = None
    duration_ms: int | None = None
    position_in_feed: int | None = None
    payload: dict = Field(default_factory=dict)


class EventBatchIn(BaseModel):
    participant_id: UUID
    events: list[EventIn]


class EventBatchOut(BaseModel):
    received: int
