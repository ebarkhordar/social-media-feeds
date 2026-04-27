"""Keyword + date-range tweet collector (twscrape).

Usage:
  python collect_search.py --query '#climate lang:en' \
      --since 2026-01-01 --until 2026-03-01 \
      --out data/search/climate.jsonl --limit 50000

--since / --until are appended as X's advanced-search operators.
Writes one tweet per line as JSONL. Re-running appends new tweets only
(existing IDs on disk are skipped). twscrape handles account rotation
and rate limits internally.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from twscrape import API

from accounts import ACCOUNTS_DB
from tweet_serializer import tweet_to_dict


def build_query(query: str, since: str | None, until: str | None) -> str:
    parts = [query]
    if since:
        parts.append(f"since:{since}")
    if until:
        parts.append(f"until:{until}")
    return " ".join(parts)


def load_seen(out_path: Path) -> set[str]:
    if not out_path.exists():
        return set()
    seen: set[str] = set()
    with out_path.open() as f:
        for line in f:
            try:
                row = json.loads(line)
                if row.get("id"):
                    seen.add(str(row["id"]))
            except json.JSONDecodeError:
                continue
    return seen


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", required=True)
    ap.add_argument("--since", help="YYYY-MM-DD (inclusive)")
    ap.add_argument("--until", help="YYYY-MM-DD (exclusive)")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--limit", type=int, default=10_000)
    ap.add_argument("--product", default="Latest", choices=["Latest", "Top", "Media"])
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    query = build_query(args.query, args.since, args.until)
    seen = load_seen(args.out)
    print(f"[search] query: {query!r}")
    print(f"[search] output: {args.out} ({len(seen)} tweets already on disk)")

    api = API(str(ACCOUNTS_DB))

    written = 0
    with args.out.open("a") as f:
        async for tweet in api.search(query, limit=args.limit, kv={"product": args.product}):
            tid = str(getattr(tweet, "id_str", None) or tweet.id)
            if tid in seen:
                continue
            seen.add(tid)
            f.write(json.dumps(tweet_to_dict(tweet), ensure_ascii=False) + "\n")
            written += 1
            if written % 500 == 0:
                f.flush()
                print(f"[search] progress: {written}/{args.limit}")
            if written >= args.limit:
                break

    print(f"[search] done: {written} new tweets appended to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
