from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.algorithms.base import SortContext, sort_posts
from app.db import get_session
from app.models.event import Event, EventType
from app.models.participant import Participant
from app.models.post import Post
from app.models.study import Study
from app.schemas import FeedPost, SessionEndIn, SessionStartIn, SessionStartOut
from app.services.condition_assigner import assign_condition

router = APIRouter(prefix="/api/studies/{study_id}", tags=["participants"])


@router.post("/sessions", response_model=SessionStartOut)
async def start_session(
    study_id: UUID,
    payload: SessionStartIn,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SessionStartOut:
    result = await session.execute(
        select(Study)
        .where(Study.id == study_id)
        .options(selectinload(Study.conditions), selectinload(Study.posts))
    )
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(404, detail="Study not found")
    if not study.is_active:
        raise HTTPException(400, detail="Study is not active")

    condition = assign_condition(
        participant_external_id=payload.participant_external_id,
        study_id=str(study.id),
        conditions=list(study.conditions),
    )

    participant = Participant(
        study_id=study.id,
        condition_id=condition.id,
        external_id=payload.participant_external_id,
        user_agent=payload.user_agent or request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        url_params=payload.url_params,
    )
    session.add(participant)
    await session.flush()

    session.add(
        Event(
            participant_id=participant.id,
            event_type=EventType.SESSION_START,
            client_timestamp_ms=0,
            payload={"condition_label": condition.label},
        )
    )

    ctx = SortContext(
        participant_external_id=payload.participant_external_id,
        algorithm=condition.algorithm,
        params=condition.algorithm_params,
    )
    sorted_posts = sort_posts(list(study.posts), ctx)

    feed_posts = [
        FeedPost(
            external_id=p.external_id,
            author=p.author,
            handle=p.handle,
            avatar_color=p.avatar_color,
            text=p.text,
            timestamp_label=p.timestamp_label,
            likes=p.likes,
            retweets=p.retweets,
            replies=p.replies,
            sentiment=p.sentiment,
            position=i,
        )
        for i, p in enumerate(sorted_posts)
    ]

    await session.commit()

    return SessionStartOut(
        participant_id=participant.id,
        study_id=study.id,
        study_name=study.name,
        condition_id=condition.id,
        condition_label=condition.label,
        condition_name=condition.name,
        algorithm=condition.algorithm,
        skin=study.skin,
        feed_height_px=study.feed_height_px,
        redirect_url=study.redirect_url,
        posts=feed_posts,
    )


@router.post("/sessions/end")
async def end_session(
    study_id: UUID,
    payload: SessionEndIn,
    session: AsyncSession = Depends(get_session),
) -> dict:
    participant = await session.get(Participant, payload.participant_id)
    if not participant or participant.study_id != study_id:
        raise HTTPException(404, detail="Participant not found")

    participant.completed_at = datetime.now(timezone.utc)
    session.add(
        Event(
            participant_id=participant.id,
            event_type=EventType.SESSION_END,
            client_timestamp_ms=0,
        )
    )
    await session.commit()
    return {"ok": True, "redirect_url": None}
