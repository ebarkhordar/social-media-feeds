"""Parse burner-account config from .env.

Each ACCOUNT_<N> line is: username|email|password|proxy_url
The proxy_url segment is optional; empty means no proxy.

For twscrape, the email password is assumed equal to the account password.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
ACCOUNTS_DB = HERE / "accounts.db"


@dataclass
class Account:
    username: str
    email: str
    password: str
    proxy: str | None


def load_accounts() -> list[Account]:
    load_dotenv(HERE / ".env")
    accounts: list[Account] = []
    for key, value in os.environ.items():
        if not key.startswith("ACCOUNT_") or not value.strip():
            continue
        parts = value.split("|")
        if len(parts) < 3:
            raise ValueError(
                f"{key} must be username|email|password[|proxy], got: {value!r}"
            )
        username, email, password = parts[0], parts[1], parts[2]
        proxy = parts[3] if len(parts) > 3 and parts[3] else None
        accounts.append(Account(username, email, password, proxy))
    if not accounts:
        raise RuntimeError("No ACCOUNT_* entries found in .env")
    return accounts
