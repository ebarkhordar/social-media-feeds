"""Poll an IMAP inbox for a Twitter/X confirmation code and return it.

Based on the non-SSL IMAP flow used by the burner mail provider
(viliamod.store). Host is derived as mail.<domain>.

Public API:
    fetch_confirmation_code(email_addr, password, started_at, timeout=60) -> str | None
"""
from __future__ import annotations

import email
import imaplib
import re
import time
from email.header import decode_header

CODE_PATTERNS = [
    re.compile(r"(?i)code\s+is[:\s]+([A-Za-z0-9]{4,10})"),
    re.compile(r"(?i)\b([A-Za-z0-9]{4,10})\s+is\s+your.*(?:code|verification)"),
    re.compile(r"(?i)(?:verification|confirmation)\s+code[:\s]+([A-Za-z0-9]{4,10})"),
]


def _decode_header(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    out = []
    for text, enc in parts:
        if isinstance(text, bytes):
            try:
                out.append(text.decode(enc or "utf-8", errors="replace"))
            except LookupError:
                out.append(text.decode("utf-8", errors="replace"))
        else:
            out.append(text)
    return "".join(out)


def _body_text(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode(errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            return payload.decode(errors="replace")
    return ""


def _extract_code(text: str) -> str | None:
    for pat in CODE_PATTERNS:
        m = pat.search(text)
        if m:
            return m.group(1)
    return None


def _email_date_epoch(msg: email.message.Message) -> float:
    try:
        dt = email.utils.parsedate_to_datetime(msg.get("Date", ""))
        return dt.timestamp() if dt else 0.0
    except Exception:
        return 0.0


def fetch_confirmation_code(
    email_addr: str,
    password: str,
    started_at: float,
    timeout: float = 60.0,
    poll_interval: float = 3.0,
) -> str | None:
    """Poll the inbox for an email newer than started_at containing a code."""
    host = "mail." + email_addr.split("@")[-1]
    deadline = time.time() + timeout

    while time.time() < deadline:
        try:
            mail = imaplib.IMAP4(host)
            mail.login(email_addr, password)
            mail.select("inbox")
            status, data = mail.search(None, "ALL")
            if status != "OK":
                mail.logout()
                time.sleep(poll_interval)
                continue
            ids = data[0].split()
            for mid in reversed(ids[-20:]):
                _, fetched = mail.fetch(mid, "(RFC822)")
                for part in fetched:
                    if not isinstance(part, tuple):
                        continue
                    msg = email.message_from_bytes(part[1])
                    if _email_date_epoch(msg) < started_at - 5:
                        mail.logout()
                        return None  # no new email; poll again
                    subject = _decode_header(msg.get("Subject"))
                    code = _extract_code(subject)
                    if not code:
                        code = _extract_code(_body_text(msg))
                    if code:
                        mail.logout()
                        return code
            mail.logout()
        except Exception as exc:
            print(f"[imap] poll error ({exc!r}); retrying")
        time.sleep(poll_interval)

    return None
