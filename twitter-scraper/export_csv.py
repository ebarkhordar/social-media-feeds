"""Convert collected JSONL into two CSVs for analysis.

Usage:
  python export_csv.py --search-dir data/search --replies-dir data/replies \
      --tweets-out data/tweets.csv --replies-out data/replies.csv

tweets.csv  — all tweets from search + all root+reply tweets (deduped by id)
replies.csv — (root_id, reply_id) edges from the replies trees
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd


def read_jsonl(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--search-dir", type=Path, default=Path("data/search"))
    ap.add_argument("--replies-dir", type=Path, default=Path("data/replies"))
    ap.add_argument("--tweets-out", type=Path, required=True)
    ap.add_argument("--replies-out", type=Path, required=True)
    args = ap.parse_args()

    all_tweets: list[dict] = []
    reply_edges: list[dict] = []

    if args.search_dir.exists():
        for p in sorted(args.search_dir.glob("*.jsonl")):
            rows = read_jsonl(p)
            all_tweets.extend(rows)
            print(f"[export] search {p.name}: {len(rows)} tweets")

    if args.replies_dir.exists():
        for p in sorted(args.replies_dir.glob("*.jsonl")):
            rows = read_jsonl(p)
            root_id = None
            for row in rows:
                role = row.pop("_role", None)
                all_tweets.append(row)
                if role == "root":
                    root_id = row.get("id")
                elif role == "reply" and root_id is not None:
                    reply_edges.append({"root_id": root_id, "reply_id": row.get("id")})
            print(f"[export] replies {p.name}: {len(rows)} tweets")

    if not all_tweets:
        print("[export] no input data found")
        return

    df = pd.DataFrame(all_tweets)
    df = df.drop_duplicates(subset=["id"], keep="first")
    # stringify list-valued cols so CSV stays readable
    for col in ("hashtags", "links", "media_urls"):
        if col in df.columns:
            df[col] = df[col].apply(lambda v: json.dumps(v) if isinstance(v, list) else v)

    args.tweets_out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.tweets_out, index=False)
    print(f"[export] wrote {len(df)} unique tweets -> {args.tweets_out}")

    if reply_edges:
        pd.DataFrame(reply_edges).drop_duplicates().to_csv(args.replies_out, index=False)
        print(f"[export] wrote {len(reply_edges)} reply edges -> {args.replies_out}")


if __name__ == "__main__":
    main()
