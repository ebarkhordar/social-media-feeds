from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.event import Event
    from app.models.study import Condition, Study


class Participant(SQLModel, table=True):
    __tablename__ = "participants"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    study_id: UUID = Field(foreign_key="studies.id", index=True)
    condition_id: UUID = Field(foreign_key="conditions.id", index=True)
    external_id: str = Field(
        max_length=200,
        index=True,
        description="Participant ID from recruitment platform (Prolific/MTurk/Qualtrics).",
    )

    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = Field(default=None)

    user_agent: str | None = Field(default=None, max_length=500)
    ip_address: str | None = Field(default=None, max_length=45)
    url_params: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
        description="Raw query parameters captured at session start.",
    )

    study: "Study" = Relationship(back_populates="participants")
    condition: "Condition" = Relationship(back_populates="participants")
    events: list["Event"] = Relationship(
        back_populates="participant",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
