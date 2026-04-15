from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.event import Event
from app.models.participant import Participant
from app.schemas import EventBatchIn, EventBatchOut

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("", response_model=EventBatchOut)
async def ingest_events(
    batch: EventBatchIn,
    session: AsyncSession = Depends(get_session),
) -> EventBatchOut:
    participant = await session.get(Participant, batch.participant_id)
    if not participant:
        raise HTTPException(404, detail="Participant not found")

    for e in batch.events:
        session.add(
            Event(
                participant_id=participant.id,
                event_type=e.event_type,
                client_timestamp_ms=e.client_timestamp_ms,
                post_external_id=e.post_external_id,
                duration_ms=e.duration_ms,
                position_in_feed=e.position_in_feed,
                payload=e.payload,
            )
        )

    await session.commit()
    return EventBatchOut(received=len(batch.events))
