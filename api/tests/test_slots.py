from datetime import UTC, date, datetime, time, timedelta

from app.slots import free_slots

DAY = date(2030, 1, 7)  # a Monday
HOUR = timedelta(hours=1)
LONG_AGO = datetime(2000, 1, 1, tzinfo=UTC)


def utc(h, m=0):
    # Bangkok is UTC+7, so 09:00 Bangkok is 02:00 UTC.
    return datetime(2030, 1, 7, h - 7, m, tzinfo=UTC)


def test_slots_fill_opening_hours_in_15_minute_steps():
    slots = free_slots(DAY, "Asia/Bangkok", time(9), time(12), HOUR, [], LONG_AGO)
    assert slots[0] == utc(9)
    assert slots[-1] == utc(11)  # the last hour-long slot that still ends by 12:00
    assert len(slots) == 9


def test_slots_skip_overlapping_bookings():
    busy = [(utc(10), utc(11))]
    slots = free_slots(DAY, "Asia/Bangkok", time(9), time(12), HOUR, busy, LONG_AGO)
    assert slots == [utc(9), utc(11)]  # 9:15-10:45 starts would all overlap 10-11


def test_slots_skip_times_already_past():
    slots = free_slots(DAY, "Asia/Bangkok", time(9), time(12), HOUR, [], now=utc(10, 5))
    assert slots == [utc(10, 15), utc(10, 30), utc(10, 45), utc(11)]


def test_slots_survive_daylight_saving_change():
    # London clocks jump from 01:00 to 02:00 on 2030-03-31; slots must stay 15 real minutes apart.
    slots = free_slots(date(2030, 3, 31), "Europe/London", time(0), time(4), HOUR, [], LONG_AGO)
    assert all(b - a == timedelta(minutes=15) for a, b in zip(slots, slots[1:]))
