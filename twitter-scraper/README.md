# twitter-scraper

Account-based Twitter/X scraper for feed-experiment research. Uses
[twscrape](https://github.com/vladkens/twscrape) with a burner-account pool.

## Why the two-step workflow

X's login POST (`api.x.com/1.1/onboarding/task.json`) is protected by a
Cloudflare WAF rule that returns 403 from datacenter and reputation-flagged
IPs — twscrape's `pool.login_all()` can't get through. A real browser on a
residential IP has no such issue because the WAF rule only targets the
programmatic login path. So:

1. **`extract_cookies.py`** — Playwright-drives a real Chromium on your
   Mac to log in each burner interactively, then captures the three
   session cookies (`auth_token`, `ct0`, `twid`) into `data/accounts_wCookies.json`.
2. **`setup_accounts.py`** — reads that JSON and feeds the cookies into
   twscrape's pool via `pool.add_account(..., cookies=...)`. No login
   POST is ever issued.

After that, `collect_search.py` / `collect_replies.py` can run from
anywhere — including a datacenter — because read endpoints aren't
subject to the same WAF rule.

## Setup

```bash
cd twitter-scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env
# edit .env: one ACCOUNT_N=username|email|password|proxy_url per burner
```

## 1. Capture cookies (once per account, on your Mac)

```bash
python extract_cookies.py --only smith_will78633     # test one first
python extract_cookies.py                             # then all accounts
```

A Chromium window opens. The script drives it (username → email/phone
challenge → password → IMAP-fetched verification code). If a CAPTCHA
appears, solve it manually in the browser — the script will keep
waiting. Output: `data/accounts_wCookies.json`.

## 2. Register in twscrape's pool

```bash
python setup_accounts.py
```

This imports cookies into `accounts.db` (also created here). No login
POST, so this is safe to run from any IP.

## 3. Collect

```bash
python collect_search.py --query '#climate lang:en' \
    --since 2026-01-01 --until 2026-03-01 \
    --out data/search/climate.jsonl --limit 50000

python collect_replies.py --ids-file targets.txt --out-dir data/replies

python export_csv.py --tweets-out data/tweets.csv --replies-out data/replies.csv
```

## Safety notes

- **Burner accounts only.** Never put your personal account in `.env`.
- **Cookie extraction = riskiest step.** Running `extract_cookies.py`
  still performs a real login, which counts as a "new-device" event for
  X. Extract once, keep cookies; don't re-run needlessly.
- **Rate limits reset every 15 min per endpoint per account.** twscrape
  rotates the pool automatically. Budget for 1–2 accounts getting
  suspended per 100k-tweet collection.
- X's 2026 ToS includes a $15k liquidated-damages clause for >1M posts
  per 24h. Stay well under.

## Files

| File | Purpose |
|---|---|
| `.env` | burner credentials + proxies (gitignored) |
| `data/accounts_wCookies.json` | Playwright-captured session cookies (gitignored) |
| `accounts.db` | twscrape SQLite pool (gitignored) |
| `data/search/` | JSONL output from `collect_search.py` |
| `data/replies/` | one JSONL per root tweet from `collect_replies.py` |
| `accounts.py` | `.env` parser |
| `imap_fetch.py` | email confirmation-code fetcher (viliamod.store IMAP) |
| `extract_cookies.py` | Playwright login + cookie dump |
| `setup_accounts.py` | cookies JSON → twscrape pool |
| `tweet_serializer.py` | twscrape Tweet → dict flattener |
| `collect_search.py` | keyword/date search collector |
| `collect_replies.py` | reply-tree collector |
| `export_csv.py` | JSONL → CSV |
