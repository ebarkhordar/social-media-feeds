"""Seed the database with an example study.

Run with:
  python -m app.seed
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.db import async_session_maker, create_all_tables
from app.models.post import Post
from app.models.study import Condition, SortAlgorithm, Study

EXAMPLE_POSTS_FILE = Path(__file__).parent.parent.parent / "examples" / "sample-posts.json"


async def seed() -> None:
    await create_all_tables()

    async with async_session_maker() as session:
        study = Study(
            name="International Student Visa Feed — Example",
            description=(
                "Example study exploring how feed ordering of posts about "
                "international student visa issues affects participant attitudes."
            ),
            skin="twitter",
            feed_height_px=700,
        )
        session.add(study)
        await session.flush()

        conditions = [
            Condition(
                study_id=study.id,
                name="Negative content first",
                label="A",
                algorithm=SortAlgorithm.SENTIMENT_LOW,
                weight=1,
            ),
            Condition(
                study_id=study.id,
                name="Positive content first",
                label="B",
                algorithm=SortAlgorithm.SENTIMENT_HIGH,
                weight=1,
            ),
            Condition(
                study_id=study.id,
                name="Random order (control)",
                label="C",
                algorithm=SortAlgorithm.RANDOM,
                weight=1,
            ),
        ]
        for c in conditions:
            session.add(c)

        with EXAMPLE_POSTS_FILE.open("r", encoding="utf-8") as f:
            posts_data = json.load(f)

        for p in posts_data:
            session.add(
                Post(
                    study_id=study.id,
                    external_id=p["id"],
                    author=p["author"],
                    handle=p["handle"],
                    avatar_color=p.get("avatar_color", "#1DA1F2"),
                    text=p["text"],
                    timestamp_label=p.get("timestamp", "1h"),
                    likes=p.get("likes", 0),
                    retweets=p.get("retweets", 0),
                    replies=p.get("replies", 0),
                    category=p.get("category"),
                    topic=p.get("topic"),
                    sentiment=p.get("sentiment"),
                )
            )

        await session.commit()
        print(f"Seeded study {study.id} with {len(posts_data)} posts and {len(conditions)} conditions.")
        print(f"Example URL: http://localhost:5173/feed/{study.id}?participant_id=test001")


if __name__ == "__main__":
    asyncio.run(seed())
