from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.participant import Participant
    from app.models.post import Post


class SortAlgorithm(str, Enum):
    DEFAULT = "default"
    RANDOM = "random"
    CHRONOLOGICAL = "chronological"
    ENGAGEMENT = "engagement"
    SENTIMENT_HIGH = "sentiment_high"
    SENTIMENT_LOW = "sentiment_low"
    CUSTOM_SCORE = "custom_score"


class Study(SQLModel, table=True):
    __tablename__ = "studies"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(index=True, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    redirect_url: str | None = Field(
        default=None,
        description="URL to send participants to after the feed task completes.",
    )
    skin: str = Field(
        default="twitter",
        description="Visual skin: twitter, instagram, facebook, plain.",
    )
    feed_height_px: int = Field(default=700)
    is_active: bool = Field(default=True)

    conditions: list["Condition"] = Relationship(
        back_populates="study",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    posts: list["Post"] = Relationship(
        back_populates="study",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    participants: list["Participant"] = Relationship(
        back_populates="study",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Condition(SQLModel, table=True):
    __tablename__ = "conditions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    study_id: UUID = Field(foreign_key="studies.id", index=True)
    name: str = Field(max_length=100, description="Human-readable label, e.g. 'Control'.")
    label: str = Field(
        max_length=20,
        description="Short code used in URL params, e.g. 'A', 'B', 'C'.",
    )
    algorithm: SortAlgorithm = Field(default=SortAlgorithm.DEFAULT)
    algorithm_params: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description="Algorithm-specific parameters, e.g. score field name, threshold.",
    )
    weight: int = Field(
        default=1,
        description="Relative probability weight when assigning participants.",
    )

    study: Study = Relationship(back_populates="conditions")
    participants: list["Participant"] = Relationship(back_populates="condition")
