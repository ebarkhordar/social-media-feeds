"""Feed sorting algorithms.

Each algorithm takes a list of Post objects and a SortContext (which includes the
participant ID for seeding randomness and any algorithm-specific parameters) and
returns a new list of posts in the desired display order. Algorithms must be pure
functions of their inputs — no DB access, no side effects — so they can be unit
tested in isolation and swapped in/out per condition.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from app.models.post import Post
from app.models.study import SortAlgorithm


@dataclass
class SortContext:
    participant_external_id: str
    algorithm: SortAlgorithm
    params: dict[str, Any] = field(default_factory=dict)


def _seed_from(participant_id: str) -> int:
    """Deterministic integer seed derived from a participant ID."""
    digest = hashlib.sha256(participant_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big")


def sort_posts(posts: list[Post], ctx: SortContext) -> list[Post]:
    algo = ctx.algorithm
    if algo == SortAlgorithm.DEFAULT:
        return list(posts)
    if algo == SortAlgorithm.RANDOM:
        return _sort_random(posts, ctx)
    if algo == SortAlgorithm.CHRONOLOGICAL:
        return sorted(posts, key=lambda p: p.created_at, reverse=True)
    if algo == SortAlgorithm.ENGAGEMENT:
        return sorted(
            posts,
            key=lambda p: (p.likes or 0) + (p.retweets or 0) + (p.replies or 0),
            reverse=True,
        )
    if algo == SortAlgorithm.SENTIMENT_HIGH:
        return sorted(posts, key=lambda p: p.sentiment if p.sentiment is not None else 0.0, reverse=True)
    if algo == SortAlgorithm.SENTIMENT_LOW:
        return sorted(posts, key=lambda p: p.sentiment if p.sentiment is not None else 0.0)
    if algo == SortAlgorithm.CUSTOM_SCORE:
        return _sort_by_custom_score(posts, ctx)
    return list(posts)


def _sort_random(posts: list[Post], ctx: SortContext) -> list[Post]:
    import random

    rng = random.Random(_seed_from(ctx.participant_external_id))
    shuffled = list(posts)
    rng.shuffle(shuffled)
    return shuffled


def _sort_by_custom_score(posts: list[Post], ctx: SortContext) -> list[Post]:
    """Sort by a named attribute on post.attributes (JSONB).

    Params:
      score_field: name of the attribute key to sort by (required)
      descending:  true to sort high-first (default), false for low-first
    """
    field_name = ctx.params.get("score_field")
    if not field_name:
        return list(posts)
    descending = bool(ctx.params.get("descending", True))

    def key(p: Post) -> float:
        value = p.attributes.get(field_name) if p.attributes else None
        if value is None:
            return float("-inf") if descending else float("inf")
        try:
            return float(value)
        except (TypeError, ValueError):
            return float("-inf") if descending else float("inf")

    return sorted(posts, key=key, reverse=descending)
