"""Assign participants to conditions.

Deterministic, weight-aware assignment: the same participant ID always gets the
same condition within a study (so if they reload the page, they stay in the same
cell), but across many participants the distribution respects the weights set on
each condition.
"""

from __future__ import annotations

import hashlib

from app.models.study import Condition


def _hash_to_unit(key: str) -> float:
    """Map an arbitrary string to a float in [0, 1) deterministically."""
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    # Take the first 8 bytes as a uint64 and divide by 2^64
    as_int = int.from_bytes(digest[:8], byteorder="big")
    return as_int / (1 << 64)


def assign_condition(
    participant_external_id: str,
    study_id: str,
    conditions: list[Condition],
) -> Condition:
    if not conditions:
        raise ValueError("Cannot assign condition: study has no conditions defined.")

    # Weighted selection using a stable hash of (study_id, participant_id)
    total_weight = sum(max(c.weight, 0) for c in conditions)
    if total_weight <= 0:
        # Fall back to uniform if all weights are zero
        return _uniform_assign(participant_external_id, study_id, conditions)

    u = _hash_to_unit(f"{study_id}:{participant_external_id}")
    target = u * total_weight
    cumulative = 0.0
    for cond in conditions:
        cumulative += max(cond.weight, 0)
        if target < cumulative:
            return cond
    return conditions[-1]


def _uniform_assign(
    participant_external_id: str, study_id: str, conditions: list[Condition]
) -> Condition:
    u = _hash_to_unit(f"{study_id}:{participant_external_id}")
    idx = int(u * len(conditions))
    idx = min(idx, len(conditions) - 1)
    return conditions[idx]
