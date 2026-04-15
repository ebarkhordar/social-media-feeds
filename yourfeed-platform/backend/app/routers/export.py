import csv
import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models.event import Event
from app.models.participant import Participant
from app.models.study import Study

router = APIRouter(prefix="/api/studies/{study_id}/export", tags=["export"])


@router.get("/events.csv")
async def export_events(
    study_id: UUID,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    study = await session.get(Study, study_id)
    if not study:
        raise HTTPException(404, detail="Study not found")

    result = await session.execute(
        select(Participant)
        .where(Participant.study_id == study_id)
        .options(selectinload(Participant.condition), selectinload(Participant.events))
        .order_by(Participant.started_at)
    )
    participants = result.scalars().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "participant_external_id",
            "participant_id",
            "condition_label",
            "condition_name",
            "started_at",
            "completed_at",
            "event_type",
            "post_external_id",
            "client_timestamp_ms",
            "server_timestamp",
            "duration_ms",
            "position_in_feed",
            "payload_json",
        ]
    )

    for p in participants:
        for e in sorted(p.events, key=lambda x: x.client_timestamp_ms):
            writer.writerow(
                [
                    p.external_id,
                    str(p.id),
                    p.condition.label if p.condition else "",
                    p.condition.name if p.condition else "",
                    p.started_at.isoformat(),
                    p.completed_at.isoformat() if p.completed_at else "",
                    e.event_type.value,
                    e.post_external_id or "",
                    e.client_timestamp_ms,
                    e.server_timestamp.isoformat(),
                    e.duration_ms if e.duration_ms is not None else "",
                    e.position_in_feed if e.position_in_feed is not None else "",
                    str(e.payload) if e.payload else "{}",
                ]
            )

    buffer.seek(0)
    filename = f"study_{study_id}_events.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
