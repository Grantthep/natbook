"""Small in-memory rate limiter for login, sign-up and booking."""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

LIMITERS: list["RateLimit"] = []  # so tests can reset them


class RateLimit:
    """FastAPI dependency allowing `times` requests per `seconds` from one client address.

    shortcut: counts live in this process's memory, so they reset on restart and aren't shared
    between processes. Fine for one instance; move to Redis before running several.
    """

    def __init__(self, times: int, seconds: int):
        self.times, self.seconds = times, seconds
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        LIMITERS.append(self)

    def __call__(self, request: Request):
        # Behind Vercel and Render the visitor's address is the first X-Forwarded-For entry.
        # A determined attacker can forge it, so this stops casual abuse, not a targeted attack.
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        client = forwarded or (request.client.host if request.client else "unknown")
        now = time.monotonic()
        hits = self.hits[client]
        while hits and hits[0] <= now - self.seconds:
            hits.popleft()
        if len(hits) >= self.times:
            raise HTTPException(429, "Too many attempts. Please wait a few minutes and try again.")
        hits.append(now)


login_limit = RateLimit(times=10, seconds=5 * 60)
register_limit = RateLimit(times=5, seconds=60 * 60)
booking_limit = RateLimit(times=20, seconds=60 * 60)
