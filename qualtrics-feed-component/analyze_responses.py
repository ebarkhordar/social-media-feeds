"""
Analyze Qualtrics Feed Component Responses

Usage:
  1. In Qualtrics → Data & Analysis → Export & Import → Export Data → CSV
  2. Run: python analyze_responses.py <path_to_csv>

Parses the dwell_data and engagement_data JSON fields into readable tables.
"""

import json
import sys
import csv
from pathlib import Path


def parse_responses(csv_path):
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        reader = list(csv.DictReader(f))

    # Qualtrics CSVs have 2 header rows after the column names (descriptions + import IDs)
    # Skip them if they exist
    if len(reader) >= 2 and reader[0].get("StartDate", "").startswith("{"):
        reader = reader[2:]
    elif len(reader) >= 2:
        # Check if second row looks like metadata
        second = reader[0]
        if any(v and v.startswith("{\"ImportId\"") for v in second.values()):
            reader = reader[2:]
        elif any(v and "ImportId" in str(v) for v in second.values()):
            reader = reader[1:]

    print("=" * 70)
    print(f"FEED EXPERIMENT ANALYSIS — {len(reader)} response(s)")
    print("=" * 70)

    for i, row in enumerate(reader):
        participant_id = row.get("participant_id", "unknown")
        condition = row.get("condition", "?")
        age = row.get("Q2 - What is your age?", row.get("Q2", ""))
        feeling = row.get("Q4 - How did the content in the feed make you feel?",
                         row.get("Q4", ""))

        print(f"\n{'—' * 70}")
        print(f"RESPONSE {i+1}: Participant={participant_id}, Condition={condition}")
        if age:
            print(f"  Age: {age}")
        if feeling:
            print(f"  Post-feed feeling: {feeling}")
        print()

        # Parse dwell data
        dwell_raw = row.get("dwell_data", "")
        if dwell_raw:
            try:
                dwell = json.loads(dwell_raw)
                duration_s = round(dwell.get("feedDurationMs", 0) / 1000, 1)
                scroll_pct = dwell.get("scrollDepthPct", 0)
                sort_mode = dwell.get("sortMode", "?")

                print(f"  FEED SESSION:")
                print(f"    Sort mode:    {sort_mode}")
                print(f"    Duration:     {duration_s}s")
                print(f"    Scroll depth: {scroll_pct}%")
                print()

                posts = dwell.get("posts", {})
                if posts:
                    # Sort by position
                    sorted_posts = sorted(posts.items(),
                                         key=lambda x: x[1].get("pos", 0))

                    print(f"  DWELL TIME PER POST (sorted by feed position):")
                    print(f"  {'Post ID':<12} {'Pos':>4} {'Dwell':>8} {'1s':>4} {'3s':>4} {'5s':>4}")
                    print(f"  {'—'*12} {'—'*4} {'—'*8} {'—'*4} {'—'*4} {'—'*4}")

                    for post_id, data in sorted_posts:
                        ms = data.get("ms", 0)
                        dwell_str = f"{ms}ms" if ms < 1000 else f"{ms/1000:.1f}s"
                        v1 = "Y" if data.get("v1s") else "-"
                        v3 = "Y" if data.get("v3s") else "-"
                        v5 = "Y" if data.get("v5s") else "-"
                        print(f"  {post_id:<12} {data.get('pos', '?'):>4} {dwell_str:>8} {v1:>4} {v3:>4} {v5:>4}")

                    # Summary stats
                    all_ms = [p.get("ms", 0) for p in posts.values()]
                    viewed = [ms for ms in all_ms if ms > 0]
                    print()
                    print(f"  SUMMARY:")
                    print(f"    Posts viewed (>0ms): {len(viewed)}/{len(all_ms)}")
                    if viewed:
                        print(f"    Avg dwell (viewed):  {sum(viewed)/len(viewed):.0f}ms ({sum(viewed)/len(viewed)/1000:.1f}s)")
                        print(f"    Max dwell:           {max(viewed)}ms ({max(viewed)/1000:.1f}s)")
                        print(f"    Min dwell:           {min(viewed)}ms ({min(viewed)/1000:.1f}s)")
                        v1_count = sum(1 for p in posts.values() if p.get("v1s"))
                        v3_count = sum(1 for p in posts.values() if p.get("v3s"))
                        v5_count = sum(1 for p in posts.values() if p.get("v5s"))
                        print(f"    Posts viewed ≥1s:    {v1_count}")
                        print(f"    Posts viewed ≥3s:    {v3_count}")
                        print(f"    Posts viewed ≥5s:    {v5_count}")

            except json.JSONDecodeError:
                print(f"  [Could not parse dwell_data]")

        # Parse engagement data
        eng_raw = row.get("engagement_data", "")
        if eng_raw:
            try:
                eng = json.loads(eng_raw)
                actions = eng.get("actions", [])

                if actions:
                    print()
                    print(f"  ENGAGEMENT ACTIONS ({len(actions)} total):")
                    print(f"  {'Time':>8} {'Action':<10} {'Post ID':<12} {'State':<8}")
                    print(f"  {'—'*8} {'—'*10} {'—'*12} {'—'*8}")

                    for a in actions:
                        t = a.get("timestamp", 0)
                        t_str = f"{t/1000:.1f}s"
                        state = "ON" if a.get("active") else "OFF"
                        print(f"  {t_str:>8} {a.get('action', '?'):<10} {a.get('postId', '?'):<12} {state:<8}")

                    # Engagement summary
                    final_likes = set()
                    final_retweets = set()
                    final_bookmarks = set()
                    for a in actions:
                        pid = a.get("postId")
                        act = a.get("action")
                        active = a.get("active")
                        if act == "like":
                            if active: final_likes.add(pid)
                            else: final_likes.discard(pid)
                        elif act == "retweet":
                            if active: final_retweets.add(pid)
                            else: final_retweets.discard(pid)
                        elif act == "bookmark":
                            if active: final_bookmarks.add(pid)
                            else: final_bookmarks.discard(pid)

                    print()
                    print(f"  FINAL ENGAGEMENT STATE:")
                    print(f"    Liked:      {sorted(final_likes) if final_likes else 'none'}")
                    print(f"    Retweeted:  {sorted(final_retweets) if final_retweets else 'none'}")
                    print(f"    Bookmarked: {sorted(final_bookmarks) if final_bookmarks else 'none'}")
                else:
                    print(f"\n  No engagement actions recorded.")

            except json.JSONDecodeError:
                print(f"  [Could not parse engagement_data]")

        if not dwell_raw and not eng_raw:
            print("  [No feed tracking data for this response]")

    print(f"\n{'=' * 70}")
    print("Done.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_responses.py <qualtrics_export.csv>")
        print("\nTo get the CSV:")
        print("  1. Qualtrics → Data & Analysis → Export & Import → Export Data")
        print("  2. Choose CSV format, click Download")
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"Error: File not found: {csv_path}")
        sys.exit(1)

    parse_responses(csv_path)
