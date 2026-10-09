"""Endpoints customers use on a business's booking page. No login needed."""
import secrets
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from .models import Booking, Business, Service
from .owner import business_out
from .schemas import (
    BookingCreatedOut, BookingIn, BusinessOut, Category, CustomerBookingOut, ShopCard, ShopListItem, SlotsOut,
)
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


@router.get("", response_model=list[ShopListItem])
def shops(category: Category | None = None, q: str | None = Query(default=None, max_length=60), db: Session = Depends(get_db)):
    """Bookable shops (at least one service and opening hours), for the marketplace home page."""
    stats = (
        select(Service.business_id, func.min(Service.price_thb).label("min_price"), func.count().label("service_count"))
        .where(Service.active).group_by(Service.business_id).subquery()
    )
    # shortcut: no pagination; add it once there are a few hundred shops.
    query = (
        select(Business, stats.c.min_price, stats.c.service_count)
        .join(stats, stats.c.business_id == Business.id)
        .where(Business.hours.any())
        .order_by(Business.name)
    )
    if category:
        query = query.where(Business.category == category)
    if q and q.strip():
        like = f"%{q.strip()}%"
        query = query.where(or_(
            Business.name.ilike(like), Business.area.ilike(like), Business.description.ilike(like),
            Business.services.any(and_(Service.active, Service.name.ilike(like))),
        ))
    return [
        ShopListItem(**ShopCard.model_validate(b).model_dump(), min_price=price, service_count=count)
        for b, price, count in db.execute(query)
    ]


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


@router.post("/{slug}/bookings", response_model=BookingCreatedOut, status_code=201)
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


# Customers manage a booking through the private link they got when booking.
bookings_router = APIRouter()


def _customer_booking(booking_id: int, token: str, db: Session) -> Booking:
    booking = db.get(Booking, booking_id)
    if not booking or not secrets.compare_digest(booking.manage_token, token):
        raise HTTPException(404, "Booking not found")
    return booking


def _customer_view(b: Booking) -> CustomerBookingOut:
    return CustomerBookingOut(
        id=b.id, shop_name=b.business.name, shop_slug=b.business.slug, timezone=b.business.timezone,
        service_name=b.service.name, price_thb=b.service.price_thb, customer_name=b.customer_name,
        starts_at=b.starts_at, ends_at=b.ends_at, status=b.status,
    )


@bookings_router.get("/{booking_id}", response_model=CustomerBookingOut)
def view_booking(booking_id: int, token: str = Query(max_length=64), db: Session = Depends(get_db)):
    return _customer_view(_customer_booking(booking_id, token, db))


@bookings_router.post("/{booking_id}/cancel", response_model=CustomerBookingOut)
def cancel_own_booking(booking_id: int, token: str = Query(max_length=64), db: Session = Depends(get_db)):
    booking = _customer_booking(booking_id, token, db)
    if booking.starts_at <= datetime.now(UTC):
        raise HTTPException(409, "This appointment has already started, so it can't be cancelled online.")
    booking.status = "cancelled"
    db.commit()
    return _customer_view(booking)
