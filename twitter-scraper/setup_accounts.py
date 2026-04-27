"""Populate twscrape's accounts.db from data/accounts_wCookies.json.

The cookie file is produced by extract_cookies.py (Playwright login).
This script reads it and registers each account in twscrape with its
auth_token/ct0/twid cookies, which lets twscrape skip the (WAF-blocked)
login POST entirely.

Usage:
  python setup_accounts.py                   # add all accounts in the JSON
  python setup_accounts.py --only <user>     # restrict to one username
  python setup_accounts.py --relogin         # relogin (uses twscrape's
                                             # cookie-refresh path)

Falls back to password-login only if --allow-login is passed and an
account in .env is missing from the cookies JSON.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from twscrape import API

from accounts import ACCOUNTS_DB, Account, load_accounts

HERE = Path(__file__).resolve().parent
COOKIES_JSON = HERE / "data" / "accounts_wCookies.json"


def load_cookie_rows() -> dict[str, dict]:
    if not COOKIES_JSON.exists():
        return {}
    try:
        rows = json.loads(COOKIES_JSON.read_text())
    except json.JSONDecodeError:
        return {}
    return {r["username"]: r for r in rows if "username" in r}


async def add_with_cookies(api: API, account: Account, row: dict) -> bool:
    cookies = f"twid={row['twid']}; ct0={row['ct0']}; auth_token={row['auth_token']}"
    try:
        await api.pool.add_account(
            username=account.username,
            password=account.password,
            email=account.email,
            email_password=account.password,
            cookies=cookies,
            proxy=account.proxy,
        )
        print(f"[add]  {account.username}: registered with cookies")
        return True
    except Exception as exc:
        msg = str(exc).lower()
        if "already" in msg or "unique" in msg:
            print(f"[add]  {account.username}: already in pool (use --relogin to refresh)")
            return True
        print(f"[fail] {account.username}: add_account error {exc!r}")
        return False


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated usernames to process")
    ap.add_argument("--relogin", action="store_true")
    ap.add_argument("--allow-login", action="store_true",
                    help="fall back to password login for accounts missing cookies")
    args = ap.parse_args()

    env_accounts = load_accounts()
    if args.only:
        keep = {u.strip() for u in args.only.split(",")}
        env_accounts = [a for a in env_accounts if a.username in keep]
        if not env_accounts:
            print(f"error: --only {args.only!r} matched no accounts in .env")
            return 2

    cookie_rows = load_cookie_rows()
    if not cookie_rows and not args.allow_login:
        print(f"error: {COOKIES_JSON.name} missing or empty — run extract_cookies.py first")
        return 2

    api = API(str(ACCOUNTS_DB))

    usernames_touched: list[str] = []
    for a in env_accounts:
        row = cookie_rows.get(a.username)
        if row and all(row.get(k) for k in ("twid", "ct0", "auth_token")):
            if await add_with_cookies(api, a, row):
                usernames_touched.append(a.username)
        elif args.allow_login:
            print(f"[fallback] {a.username}: no cookies — attempting password login (WAF-risky)")
            try:
                await api.pool.add_account(
                    username=a.username,
                    password=a.password,
                    email=a.email,
                    email_password=a.password,
                    proxy=a.proxy,
                )
                usernames_touched.append(a.username)
            except Exception as exc:
                print(f"[fail] {a.username}: {exc!r}")
        else:
            print(f"[skip] {a.username}: no cookies in {COOKIES_JSON.name} (use --allow-login to force)")

    if args.relogin and usernames_touched:
        print(f"\n[relogin] {usernames_touched}")
        await api.pool.relogin(usernames_touched)
    else:
        # login_all is cheap when cookies are already set; it just validates.
        print(f"\n[login_all] validating {usernames_touched}")
        if usernames_touched:
            await api.pool.login_all(usernames=usernames_touched)

    stats = await api.pool.accounts_info()
    wanted = set(usernames_touched)
    print("\nPool state:")
    for row in stats:
        uname = row.get("username")
        if uname in wanted:
            print(f"  {uname}: active={row.get('active')} "
                  f"logged_in={row.get('logged_in')} "
                  f"last_used={row.get('last_used')}")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
