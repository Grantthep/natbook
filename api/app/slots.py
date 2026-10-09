from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

STEP = timedelta(minutes=15)


def free_slots(day: date, tz: str, opens: time, closes: time, duration: timedelta,
               busy: list[tuple[datetime, datetime]], now: datetime, step: timedelta = STEP) -> list[datetime]:
    """Start times (UTC) on `day` where a `duration` appointment fits inside opening
    hours, starts after `now` and doesn't overlap any `busy` (start, end) interval."""
    zone = ZoneInfo(tz)
    # Step through UTC so the arithmetic stays correct in timezones with daylight saving.
    t = datetime.combine(day, opens, zone).astimezone(UTC)
    end = datetime.combine(day, closes, zone).astimezone(UTC)
    slots = []
    while t + duration <= end:
        if t > now and all(t + duration <= b_start or t >= b_end for b_start, b_end in busy):
            slots.append(t)
        t += step
    return slots
