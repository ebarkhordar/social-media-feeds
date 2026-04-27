"""Headed-Playwright login for each burner account, then dump the session
cookies twscrape needs (auth_token, ct0, twid) into a JSON file matching
the friend's schema.

Why: X's login POST endpoint is WAF-blocked from datacenter and flagged
IPs, but a real browser on a residential IP navigates the login UI
fine. After cookies are captured we feed them to twscrape via
pool.add_account(..., cookies=...) so no login POST is ever needed.

Usage:
  python extract_cookies.py                   # all accounts in .env
  python extract_cookies.py --only smith_will78633
  python extract_cookies.py --headless        # hide browser (not recommended first run)

Output:
  data/accounts_wCookies.json  (list[dict], same schema friend uses)

The script is resumable: each success is appended to the JSON, and
re-running skips accounts that already have all three cookies stored.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import Page, TimeoutError as PWTimeout, sync_playwright

from accounts import Account, load_accounts
from imap_fetch import fetch_confirmation_code

HERE = Path(__file__).resolve().parent
OUT_PATH = HERE / "data" / "accounts_wCookies.json"
LOGIN_URL = "https://x.com/i/flow/login"
HOME_URL_GLOB = "**/home"
REQUIRED_COOKIES = ("auth_token", "ct0", "twid")


def load_existing() -> list[dict]:
    if OUT_PATH.exists():
        try:
            return json.loads(OUT_PATH.read_text())
        except json.JSONDecodeError:
            return []
    return []


def save_all(rows: list[dict]) -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(rows, indent=2))


def already_done(rows: list[dict], username: str) -> bool:
    for r in rows:
        if r.get("username") == username and all(r.get(k) for k in REQUIRED_COOKIES):
            return True
    return False


def _click_any(page: Page, candidates: list, timeout_ms: int = 2000) -> bool:
    """Try each candidate locator; click the first that's visible."""
    for loc in candidates:
        try:
            if loc.first.is_visible(timeout=timeout_ms):
                loc.first.click()
                return True
        except Exception:
            continue
    return False


def click_next(page: Page) -> bool:
    return _click_any(page, [
        page.get_by_role("button", name="Next", exact=True),
        page.locator('button:has-text("Next")'),
        page.locator('div[role="button"]:has-text("Next")'),
    ])


def click_login(page: Page) -> bool:
    return _click_any(page, [
        page.locator('[data-testid="LoginForm_Login_Button"]'),
        page.get_by_role("button", name="Log in", exact=True),
        page.locator('div[role="button"]:has-text("Log in")'),
    ])


def type_and_continue(page: Page, selector: str, value: str, submit: str = "next") -> None:
    el = page.locator(selector).first
    el.click()
    el.fill("")  # clear first
    # Use .type() with per-key delay to fire real keydown/keyup events;
    # X's React form enables Next only after proper input events.
    el.type(value, delay=40)
    page.wait_for_timeout(500)
    clicked = click_next(page) if submit == "next" else click_login(page)
    if not clicked:
        page.keyboard.press("Enter")


def visible(page: Page, selector: str, timeout_ms: int = 500) -> bool:
    try:
        return page.locator(selector).first.is_visible(timeout=timeout_ms)
    except PWTimeout:
        return False
    except Exception:
        return False


def login_manual(page: Page, account: Account) -> None:
    """Open the login page and poll cookies until the 3 required are present."""
    print("\n" + "=" * 60)
    print(f"  Manual login for: {account.username}")
    print(f"  Username: {account.username}")
    print(f"  Email:    {account.email}")
    print(f"  Password: {account.password}")
    print("=" * 60)
    print("  Log in in the Chromium window. Do NOT close it.")
    print("  Script auto-captures cookies as soon as they're set.")
    print("  Timeout: 10 min.")
    print("=" * 60 + "\n")

    page.goto(LOGIN_URL, wait_until="domcontentloaded")

    deadline = time.time() + 600
    last_count = -1
    while time.time() < deadline:
        try:
            cookies = page.context.cookies(["https://x.com", "https://twitter.com"])
        except Exception as exc:
            raise RuntimeError(f"{account.username}: browser closed during login ({exc!r})")
        present = {c["name"] for c in cookies if c["name"] in REQUIRED_COOKIES}
        if len(present) != last_count:
            print(f"[login] {account.username}: cookies present: {sorted(present)}")
            last_count = len(present)
        if all(k in present for k in REQUIRED_COOKIES):
            print(f"[login] {account.username}: all 3 cookies captured")
            return
        time.sleep(2)

    raise RuntimeError(f"{account.username}: did not get all cookies within 10 min")


def login_one(page: Page, account: Account) -> None:
    """Drive the X login UI for one account. Raises on failure."""
    started_at = time.time()
    typed_email = False
    typed_code = False
    max_loops = 25

    page.goto(LOGIN_URL, wait_until="domcontentloaded")

    for _ in range(max_loops):
        page.wait_for_timeout(800)

        # Success: URL contains /home
        if "/home" in page.url:
            print(f"[login] {account.username}: landed on home")
            return

        # Password page
        if visible(page, 'input[name="password"]'):
            print(f"[login] {account.username}: password page")
            type_and_continue(page, 'input[name="password"]', account.password, submit="login")
            # Wait for URL to move away from flow/login before next iteration
            try:
                page.wait_for_url(lambda url: "/flow/login" not in url, timeout=15000)
            except PWTimeout:
                pass
            continue

        # Username / ACID / code page — all use similar inputs
        body_text = (page.locator("body").first.text_content() or "").lower()

        if visible(page, 'input[autocomplete="username"]'):
            # First step: ask for @username
            print(f"[login] {account.username}: username page")
            type_and_continue(page, 'input[autocomplete="username"]', account.username)
            # Wait for the username input to disappear (i.e. state advanced)
            try:
                page.locator('input[autocomplete="username"]').first.wait_for(
                    state="hidden", timeout=8000
                )
            except PWTimeout:
                pass
            continue

        if visible(page, 'input[data-testid="ocfEnterTextTextInput"]'):
            wants_code = (
                "verification code" in body_text
                or "check your email" in body_text
                or "confirmation code" in body_text
            )
            wants_email = (
                "unusual" in body_text
                or "phone" in body_text and "email" in body_text
                or "enter your phone number or email" in body_text
            )

            if wants_code and not typed_code:
                print(f"[login] {account.username}: ACID code page — fetching from IMAP")
                code = fetch_confirmation_code(
                    account.email, account.password, started_at - 10, timeout=90
                )
                if not code:
                    raise RuntimeError(f"{account.username}: IMAP code fetch timed out")
                print(f"[login] {account.username}: got code {code}")
                type_and_continue(page, 'input[data-testid="ocfEnterTextTextInput"]', code)
                typed_code = True
                continue

            if wants_email and not typed_email:
                print(f"[login] {account.username}: ACID email page")
                type_and_continue(
                    page, 'input[data-testid="ocfEnterTextTextInput"]', account.email
                )
                typed_email = True
                continue

            # Fall back: assume it's asking for email first
            if not typed_email:
                print(f"[login] {account.username}: ACID input (assumed email)")
                type_and_continue(
                    page, 'input[data-testid="ocfEnterTextTextInput"]', account.email
                )
                typed_email = True
                continue

        # Captcha / human-verification page — ask user to solve in the browser
        if "arkose" in page.url.lower() or "captcha" in body_text or "verify you are human" in body_text:
            print(f"[login] {account.username}: CAPTCHA/human-verify detected. "
                  "Solve it in the visible browser window; continuing to wait...")
            page.wait_for_timeout(5000)
            continue

        print(f"[login] {account.username}: unknown state; current url={page.url!r}; waiting")

    # Automation stalled. Let the user finish manually in the visible browser.
    print(f"[login] {account.username}: automation stalled. "
          "Finish the login in the browser window — waiting up to 5 min for /home...")
    try:
        page.wait_for_url(lambda url: "/home" in url, timeout=300_000)
        print(f"[login] {account.username}: manual completion detected")
        return
    except PWTimeout:
        raise RuntimeError(f"{account.username}: did not reach /home within timeout")


def extract_cookies(page: Page) -> dict[str, str]:
    cookies = page.context.cookies(["https://x.com", "https://twitter.com"])
    out: dict[str, str] = {}
    for c in cookies:
        if c["name"] in REQUIRED_COOKIES:
            out[c["name"]] = c["value"]
    return out


def run_for_account(pw, account: Account, headless: bool, manual: bool) -> dict:
    user_agent = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    browser = pw.chromium.launch(headless=headless, slow_mo=120 if not headless else 0)
    context = browser.new_context(
        user_agent=user_agent,
        viewport={"width": 1280, "height": 820},
        locale="en-US",
    )
    page = context.new_page()
    try:
        if manual:
            login_manual(page, account)
        else:
            login_one(page, account)
        cookies = extract_cookies(page)
        missing = [k for k in REQUIRED_COOKIES if k not in cookies]
        if missing:
            raise RuntimeError(f"{account.username}: missing cookies {missing} after login")
        row = {
            "name": account.username,
            "username": account.username,
            "email": account.email,
            "password": account.password,
            **cookies,
        }
        print(f"[login] {account.username}: SUCCESS — cookies captured")
        return row
    finally:
        context.close()
        browser.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="comma-separated usernames to process")
    ap.add_argument("--headless", action="store_true", help="hide browser window")
    ap.add_argument("--force", action="store_true", help="re-extract even if cookies exist")
    ap.add_argument("--auto", action="store_true",
                    help="attempt automated login (default is manual: you log in, script captures cookies)")
    args = ap.parse_args()

    accounts = load_accounts()
    if args.only:
        keep = {u.strip() for u in args.only.split(",")}
        accounts = [a for a in accounts if a.username in keep]

    rows = load_existing()

    with sync_playwright() as pw:
        for account in accounts:
            if not args.force and already_done(rows, account.username):
                print(f"[skip] {account.username}: already has cookies in {OUT_PATH.name}")
                continue
            try:
                row = run_for_account(pw, account, args.headless, manual=not args.auto)
            except Exception as exc:
                print(f"[fail] {account.username}: {exc!r}")
                continue
            rows = [r for r in rows if r.get("username") != account.username]
            rows.append(row)
            save_all(rows)

    done = [r["username"] for r in rows if all(r.get(k) for k in REQUIRED_COOKIES)]
    print(f"\n[done] {len(done)}/{len(accounts)} accounts have cookies: {done}")
    return 0 if len(done) == len(accounts) else 1


if __name__ == "__main__":
    sys.exit(main())
