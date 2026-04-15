from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.participant import Participant


class EventType(str, Enum):
    DWELL = "dwell"
    LIKE = "like"
    RETWEET = "retweet"
    BOOKMARK = "bookmark"
    REPLY = "reply"
    LINK_CLICK = "link_click"
    SCROLL = "scroll"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    participant_id: UUID = Field(foreign_key="participants.id", index=True)
    post_external_id: str | None = Field(
        default=None,
        max_length=100,
        index=True,
        description="External ID of the post this event targets (null for session-level events).",
    )
    event_type: EventType = Field(index=True)

    client_timestamp_ms: int = Field(
        description="Milliseconds since session start (from client clock).",
    )
    server_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    duration_ms: int | None = Field(
        default=None,
        description="For dwell events: total visible time in ms.",
    )
    position_in_feed: int | None = Field(
        default=None,
        description="0-based position of the post in the sorted feed.",
    )
    payload: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description="Event-specific data (e.g. active=true for toggles, scroll percentage).",
    )

    participant: "Participant" = Relationship(back_populates="events")
