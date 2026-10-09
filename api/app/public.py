"""Endpoints customers use on a business's booking page. No login needed."""
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from .models import Booking, Business, Service
from .owner import business_out
from .schemas import BookingIn, BookingOut, BusinessOut, SlotsOut
from .slots import free_slots

router = APIRouter()
MAX_DAYS_AHEAD = 60


def _business(slug: str, db: Session) -> Business:
    business = db.scalar(select(Business).where(Business.slug == slug))
    if not business:
        raise HTTPException(404, "Business not found")
    return business


def _service(business: Business, service_id: int, db: Session) -> Service:
    service = db.get(Service, service_id)
    if not service or service.business_id != business.id or not service.active:
        raise HTTPException(404, "Service not found")
    return service


def _slots(business: Business, service: Service, day: date, db: Session) -> list[datetime]:
    hours = next((h for h in business.hours if h.weekday == day.weekday()), None)
    if not hours:
        return []
    zone = ZoneInfo(business.timezone)
    day_start = datetime.combine(day, hours.opens, zone)
    day_end = datetime.combine(day, hours.closes, zone)
    busy = db.execute(
        select(Booking.starts_at, Booking.ends_at).where(
            Booking.business_id == business.id, Booking.status != "cancelled",
            Booking.starts_at < day_end, Booking.ends_at > day_start,
        )
    ).all()
    return free_slots(day, business.timezone, hours.opens, hours.closes,
                      timedelta(minutes=service.duration_min), busy, datetime.now(UTC))


@router.get("/{slug}", response_model=BusinessOut)
def business_page(slug: str, db: Session = Depends(get_db)):
    return business_out(_business(slug, db))


@router.get("/{slug}/slots", response_model=SlotsOut)
def available_slots(slug: str, service_id: int, date: date, db: Session = Depends(get_db)):
    business = _business(slug, db)
    service = _service(business, service_id, db)
    if date > datetime.now(UTC).date() + timedelta(days=MAX_DAYS_AHEAD):
        raise HTTPException(422, f"You can book up to {MAX_DAYS_AHEAD} days ahead")
    return SlotsOut(date=date, slots=_slots(business, service, date, db))


@router.post("/{slug}/bookings", response_model=BookingOut, status_code=201)
def book(slug: str, body: BookingIn, db: Session = Depends(get_db)):
    business = _business(slug, db)
    service = _service(business, body.service_id, db)
    starts_at = body.starts_at.astimezone(UTC)
    day = starts_at.astimezone(ZoneInfo(business.timezone)).date()
    if starts_at not in _slots(business, service, day, db):
        raise HTTPException(409, "That time isn't available. Please pick another slot.")

    booking = Booking(
        business_id=business.id, service_id=service.id,
        starts_at=starts_at, ends_at=starts_at + timedelta(minutes=service.duration_min),
        **body.model_dump(include={"customer_name", "customer_email", "customer_phone"}),
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:  # someone else booked the same time a moment earlier
        raise HTTPException(409, "That time was just taken. Please pick another slot.")
    return booking
