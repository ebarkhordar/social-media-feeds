from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.study import Study


class Post(SQLModel, table=True):
    __tablename__ = "posts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    study_id: UUID = Field(foreign_key="studies.id", index=True)
    external_id: str = Field(
        max_length=100,
        index=True,
        description="Stable ID used in event logs, e.g. 'post_01'. Unique within a study.",
    )

    author: str = Field(max_length=100)
    handle: str = Field(max_length=100)
    avatar_color: str = Field(default="#1DA1F2", max_length=20)
    text: str = Field(max_length=5000)
    timestamp_label: str = Field(
        default="1h",
        max_length=20,
        description="Display label like '2h', 'Jan 5'. Not a real timestamp.",
    )

    likes: int = Field(default=0)
    retweets: int = Field(default=0)
    replies: int = Field(default=0)

    category: str | None = Field(default=None, max_length=100, index=True)
    topic: str | None = Field(default=None, max_length=100, index=True)
    sentiment: float | None = Field(
        default=None,
        description="Sentiment score from -1 (negative) to +1 (positive).",
    )
    attributes: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description="Arbitrary per-post attributes used by custom sort algorithms.",
    )

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    study: "Study" = Relationship(back_populates="posts")
