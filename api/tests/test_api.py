from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import engine
from app.models import Booking

OWNER = {"email": "owner@example.com", "password": "correct-horse"}
CUSTOMER = {"customer_name": "Mali", "customer_email": "mali@example.com"}


def next_monday():
    today = datetime.now(UTC).date()
    return today + timedelta(days=7 - today.weekday())


def setup_salon(client):
    assert client.post("/api/auth/register", json=OWNER).status_code == 201
    shop = {"name": "Sunny Salon", "slug": "sunny-salon", "category": "salon", "area": "Ari"}
    assert client.post("/api/business", json=shop).status_code == 201
    hours = [{"weekday": d, "opens": "09:00", "closes": "17:00"} for d in range(7)]
    assert client.put("/api/business/hours", json=hours).status_code == 200
    service = client.post("/api/business/services", json={"name": "Haircut", "duration_min": 60, "price_thb": 400})
    return service.json()["id"]


def slots(client, service_id, day):
    r = client.get("/api/public/sunny-salon/slots", params={"service_id": service_id, "date": day.isoformat()})
    assert r.status_code == 200
    return r.json()["slots"]


def test_customer_books_and_owner_manages(client):
    service_id = setup_salon(client)
    client.post("/api/auth/logout")

    page = client.get("/api/public/sunny-salon").json()
    assert page["services"][0]["name"] == "Haircut" and len(page["hours"]) == 7

    day = next_monday()
    available = slots(client, service_id, day)
    assert available[0].startswith(f"{day}T02:00")  # 09:00 Bangkok
    chosen = available[0]

    booking = client.post("/api/public/sunny-salon/bookings", json={"service_id": service_id, "starts_at": chosen, **CUSTOMER})
    assert booking.status_code == 201, booking.text
    assert chosen not in slots(client, service_id, day)

    again = client.post("/api/public/sunny-salon/bookings", json={"service_id": service_id, "starts_at": chosen, **CUSTOMER})
    assert again.status_code == 409

    client.post("/api/auth/login", json=OWNER)
    upcoming = client.get("/api/business/bookings").json()
    assert [b["customer_name"] for b in upcoming] == ["Mali"]

    assert client.post(f"/api/business/bookings/{upcoming[0]['id']}/cancel").json()["status"] == "cancelled"
    assert chosen in slots(client, service_id, day)


def test_database_rejects_overlapping_bookings_even_without_the_api(client):
    service_id = setup_salon(client)
    start = datetime.combine(next_monday(), datetime.min.time(), UTC) + timedelta(hours=3)

    def insert(starts_at):
        with Session(engine()) as db:
            db.add(Booking(business_id=1, service_id=service_id, starts_at=starts_at,
                           ends_at=starts_at + timedelta(hours=1), **CUSTOMER))
            db.commit()

    insert(start)
    with pytest.raises(IntegrityError):
        insert(start + timedelta(minutes=30))
    insert(start + timedelta(hours=1))  # back-to-back is fine


def test_booking_outside_opening_hours_is_rejected(client):
    service_id = setup_salon(client)
    late = f"{next_monday()}T16:30:00+07:00"  # an hour-long cut would end after 17:00
    r = client.post("/api/public/sunny-salon/bookings", json={"service_id": service_id, "starts_at": late, **CUSTOMER})
    assert r.status_code == 409


def test_marketplace_lists_only_bookable_shops_and_filters(client):
    setup_salon(client)
    client.post("/api/auth/register", json={"email": "new@example.com", "password": "new-owner-1"})
    client.post("/api/business", json={"name": "Empty Spa", "slug": "empty-spa", "category": "spa"})  # no services yet

    shops = client.get("/api/public").json()
    assert [s["slug"] for s in shops] == ["sunny-salon"]
    assert shops[0]["min_price"] == 400 and shops[0]["service_count"] == 1

    assert client.get("/api/public", params={"category": "spa"}).json() == []
    assert len(client.get("/api/public", params={"q": "haircut"}).json()) == 1  # matches service names
    assert len(client.get("/api/public", params={"q": "ari"}).json()) == 1  # and areas
    assert client.get("/api/public", params={"category": "bakery"}).status_code == 422


def test_owner_can_edit_shop_details(client):
    setup_salon(client)
    r = client.patch("/api/business", json={"name": "Sunny Salon & Spa", "category": "spa", "area": "Thonglor"})
    assert r.status_code == 200 and r.json()["area"] == "Thonglor" and r.json()["slug"] == "sunny-salon"


def test_owner_pages_need_login(client):
    assert client.get("/api/business").status_code == 401


def test_owners_cannot_touch_each_others_bookings(client):
    service_id = setup_salon(client)
    chosen = slots(client, service_id, next_monday())[0]
    booking_id = client.post("/api/public/sunny-salon/bookings",
                             json={"service_id": service_id, "starts_at": chosen, **CUSTOMER}).json()["id"]

    client.post("/api/auth/register", json={"email": "rival@example.com", "password": "another-pass"})
    client.post("/api/business", json={"name": "Rival Spa", "slug": "rival-spa", "category": "spa"})
    assert client.post(f"/api/business/bookings/{booking_id}/cancel").status_code == 404


def test_login_rejects_wrong_password_and_unknown_email(client):
    client.post("/api/auth/register", json=OWNER)
    assert client.post("/api/auth/login", json={**OWNER, "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "whatever1"}).status_code == 401
    assert client.post("/api/auth/register", json=OWNER).status_code == 409
