"""Reply-tree collector (twscrape). For each target tweet ID, fetch the
root tweet and all replies.

Usage:
  python collect_replies.py --ids-file targets.txt --out-dir data/replies
  python collect_replies.py --ids 1234567890,2345678901 --out-dir data/replies
  python collect_replies.py --limit-per-tweet 1000 --ids-file targets.txt \
      --out-dir data/replies

Writes one JSONL per root tweet: data/replies/<tweet_id>.jsonl
Each file contains the root tweet first (with _role='root'), then the
replies (one per line, _role='reply'). Re-running skips IDs whose file
already exists.
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


def load_ids(args: argparse.Namespace) -> list[str]:
    ids: list[str] = []
    if args.ids:
        ids.extend(s.strip() for s in args.ids.split(",") if s.strip())
    if args.ids_file:
        with open(args.ids_file) as f:
            ids.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))
    return ids


async def collect_one(api: API, tweet_id: str, out_path: Path, limit: int) -> int:
    if out_path.exists():
        print(f"[replies] {tweet_id}: already fetched, skipping")
        return 0

    root = await api.tweet_details(int(tweet_id))
    if root is None:
        print(f"[replies] {tweet_id}: tweet_details returned None (deleted or protected)")
        return 0

    tmp = out_path.with_suffix(".jsonl.tmp")
    count = 0
    with tmp.open("w") as f:
        f.write(json.dumps({**tweet_to_dict(root), "_role": "root"}, ensure_ascii=False) + "\n")
        count += 1
        async for reply in api.tweet_replies(int(tweet_id), limit=limit):
            f.write(json.dumps({**tweet_to_dict(reply), "_role": "reply"}, ensure_ascii=False) + "\n")
            count += 1
            if count % 200 == 0:
                f.flush()

    tmp.rename(out_path)
    print(f"[replies] {tweet_id}: {count} tweets -> {out_path}")
    return count


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", help="comma-separated tweet IDs")
    ap.add_argument("--ids-file", help="file with one tweet ID per line")
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--limit-per-tweet", type=int, default=-1,
                    help="max replies per root tweet (-1 = unlimited)")
    args = ap.parse_args()

    ids = load_ids(args)
    if not ids:
        print("error: no tweet IDs provided (use --ids or --ids-file)", file=sys.stderr)
        return 2

    args.out_dir.mkdir(parents=True, exist_ok=True)
    api = API(str(ACCOUNTS_DB))

    total = 0
    for tid in ids:
        try:
            total += await collect_one(api, tid, args.out_dir / f"{tid}.jsonl",
                                       args.limit_per_tweet)
        except Exception as exc:
            print(f"[replies] {tid}: FAILED ({exc!r})")

    print(f"[replies] done: {total} tweets across {len(ids)} conversation(s)")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
