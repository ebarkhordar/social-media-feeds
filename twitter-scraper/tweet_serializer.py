"""Flatten a twscrape Tweet into a JSON-serializable dict.

twscrape Tweets expose .dict() which already returns serializable data,
but we project a narrower schema for CSV friendliness.
"""
from __future__ import annotations

from typing import Any


def tweet_to_dict(t: Any) -> dict:
    user = getattr(t, "user", None)
    date = getattr(t, "date", None)
    return {
        "id": getattr(t, "id_str", None) or str(getattr(t, "id", "")),
        "date": date.isoformat() if hasattr(date, "isoformat") else (str(date) if date else None),
        "text": getattr(t, "rawContent", None),
        "lang": getattr(t, "lang", None),
        "reply_count": getattr(t, "replyCount", None),
        "retweet_count": getattr(t, "retweetCount", None),
        "like_count": getattr(t, "likeCount", None),
        "quote_count": getattr(t, "quoteCount", None),
        "view_count": getattr(t, "viewCount", None),
        "conversation_id": getattr(t, "conversationIdStr", None),
        "in_reply_to_tweet_id": getattr(t, "inReplyToTweetIdStr", None),
        "in_reply_to_user": getattr(getattr(t, "inReplyToUser", None), "username", None),
        "hashtags": list(getattr(t, "hashtags", []) or []),
        "links": [getattr(l, "url", None) for l in (getattr(t, "links", []) or [])],
        "media_urls": [getattr(m, "url", None) or getattr(m, "fullUrl", None)
                       for m in (getattr(t, "media", []) or [])],
        "user_id": getattr(user, "id_str", None) or (str(user.id) if user and hasattr(user, "id") else None),
        "user_username": getattr(user, "username", None),
        "user_displayname": getattr(user, "displayname", None),
        "user_followers": getattr(user, "followersCount", None),
        "user_following": getattr(user, "friendsCount", None),
        "user_verified": getattr(user, "verified", None),
        "url": getattr(t, "url", None),
    }
