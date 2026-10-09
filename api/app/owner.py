"""Endpoints for a logged-in business owner."""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import current_user
from .db import get_db
from .models import Booking, Business, OpeningHours, Service, User
from .schemas import BookingOut, BusinessDetails, BusinessIn, BusinessOut, HoursIn, ServiceIn, ServiceOut

router = APIRouter()


def business_out(b: Business) -> BusinessOut:
    return BusinessOut(
        name=b.name, slug=b.slug, category=b.category, area=b.area, description=b.description,
        timezone=b.timezone, services=[s for s in b.services if s.active], hours=b.hours,
    )


def my_business(user: User = Depends(current_user), db: Session = Depends(get_db)) -> Business:
    business = db.scalar(select(Business).where(Business.owner_id == user.id))
    if not business:
        raise HTTPException(404, "Create your business first")
    return business


@router.post("", response_model=BusinessOut, status_code=201)
def create_business(body: BusinessIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    business = Business(owner_id=user.id, **body.model_dump())
    db.add(business)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        taken = db.scalar(select(Business.id).where(Business.owner_id == user.id))
        raise HTTPException(409, "You already have a business" if taken else "That link name is taken")
    return business_out(business)


@router.get("", response_model=BusinessOut)
def get_business(business: Business = Depends(my_business)):
    return business_out(business)


@router.patch("", response_model=BusinessOut)
def update_business(body: BusinessDetails, business: Business = Depends(my_business), db: Session = Depends(get_db)):
    for field, value in body.model_dump().items():
        setattr(business, field, value)
    db.commit()
    return business_out(business)


@router.put("/hours", response_model=BusinessOut)
def set_hours(body: list[HoursIn], business: Business = Depends(my_business), db: Session = Depends(get_db)):
    if len({h.weekday for h in body}) != len(body):
        raise HTTPException(422, "Each weekday can only appear once")
    business.hours = [OpeningHours(**h.model_dump()) for h in body]
    db.commit()
    return business_out(business)


@router.post("/services", response_model=ServiceOut, status_code=201)
def add_service(body: ServiceIn, business: Business = Depends(my_business), db: Session = Depends(get_db)):
    service = Service(business_id=business.id, **body.model_dump())
    db.add(service)
    db.commit()
    return service


@router.delete("/services/{service_id}", status_code=204)
def remove_service(service_id: int, business: Business = Depends(my_business), db: Session = Depends(get_db)):
    service = db.get(Service, service_id)
    if not service or service.business_id != business.id:
        raise HTTPException(404, "Service not found")
    service.active = False  # keep the row: past bookings still point at it
    db.commit()


@router.get("/bookings", response_model=list[BookingOut])
def upcoming_bookings(business: Business = Depends(my_business), db: Session = Depends(get_db)):
    return db.scalars(
        select(Booking)
        .where(Booking.business_id == business.id, Booking.ends_at >= datetime.now(UTC))
        .order_by(Booking.starts_at)
    ).all()


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, business: Business = Depends(my_business), db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if not booking or booking.business_id != business.id:
        raise HTTPException(404, "Booking not found")
    booking.status = "cancelled"
    db.commit()
    return booking
