from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_session
from app.models.participant import Participant
from app.models.post import Post
from app.models.study import Condition, Study
from app.schemas import ConditionOut, StudyIn, StudyOut, StudySummary

router = APIRouter(prefix="/api/studies", tags=["studies"])


@router.post("", response_model=StudyOut, status_code=status.HTTP_201_CREATED)
async def create_study(payload: StudyIn, session: AsyncSession = Depends(get_session)) -> StudyOut:
    if not payload.conditions:
        raise HTTPException(400, detail="At least one condition is required.")
    if not payload.posts:
        raise HTTPException(400, detail="At least one post is required.")

    study = Study(
        name=payload.name,
        description=payload.description,
        redirect_url=payload.redirect_url,
        skin=payload.skin,
        feed_height_px=payload.feed_height_px,
    )
    session.add(study)
    await session.flush()

    for c in payload.conditions:
        session.add(
            Condition(
                study_id=study.id,
                name=c.name,
                label=c.label,
                algorithm=c.algorithm,
                algorithm_params=c.algorithm_params,
                weight=c.weight,
            )
        )

    for p in payload.posts:
        session.add(
            Post(
                study_id=study.id,
                external_id=p.external_id,
                author=p.author,
                handle=p.handle,
                avatar_color=p.avatar_color,
                text=p.text,
                timestamp_label=p.timestamp_label,
                likes=p.likes,
                retweets=p.retweets,
                replies=p.replies,
                category=p.category,
                topic=p.topic,
                sentiment=p.sentiment,
                attributes=p.attributes,
            )
        )

    await session.commit()
    return await _study_out(session, study.id)


@router.get("", response_model=list[StudySummary])
async def list_studies(session: AsyncSession = Depends(get_session)) -> list[StudySummary]:
    result = await session.execute(select(Study).order_by(Study.created_at.desc()))
    studies = result.scalars().all()

    summaries: list[StudySummary] = []
    for s in studies:
        p_count = await session.scalar(
            select(func.count(Participant.id)).where(Participant.study_id == s.id)
        )
        c_count = await session.scalar(
            select(func.count(Condition.id)).where(Condition.study_id == s.id)
        )
        post_count = await session.scalar(
            select(func.count(Post.id)).where(Post.study_id == s.id)
        )
        summaries.append(
            StudySummary(
                id=s.id,
                name=s.name,
                created_at=s.created_at,
                is_active=s.is_active,
                participant_count=p_count or 0,
                condition_count=c_count or 0,
                post_count=post_count or 0,
            )
        )
    return summaries


@router.get("/{study_id}", response_model=StudyOut)
async def get_study(study_id: UUID, session: AsyncSession = Depends(get_session)) -> StudyOut:
    return await _study_out(session, study_id)


@router.delete("/{study_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_study(study_id: UUID, session: AsyncSession = Depends(get_session)) -> None:
    study = await session.get(Study, study_id)
    if not study:
        raise HTTPException(404, detail="Study not found")
    await session.delete(study)
    await session.commit()


async def _study_out(session: AsyncSession, study_id: UUID) -> StudyOut:
    result = await session.execute(
        select(Study).where(Study.id == study_id).options(selectinload(Study.conditions))
    )
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(404, detail="Study not found")

    return StudyOut(
        id=study.id,
        name=study.name,
        description=study.description,
        created_at=study.created_at,
        redirect_url=study.redirect_url,
        skin=study.skin,
        feed_height_px=study.feed_height_px,
        is_active=study.is_active,
        conditions=[
            ConditionOut(
                id=c.id,
                study_id=c.study_id,
                name=c.name,
                label=c.label,
                algorithm=c.algorithm,
                algorithm_params=c.algorithm_params,
                weight=c.weight,
            )
            for c in study.conditions
        ],
    )
