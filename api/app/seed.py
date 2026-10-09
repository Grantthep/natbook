"""Create the demo account and booking page if they don't exist yet:  python -m app.seed"""
from datetime import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hasher
from .db import engine
from .models import Base, Business, OpeningHours, Service, User

DEMO_EMAIL = "demo@natbook.app"
DEMO_PASSWORD = "demo-password"


def seed():
    Base.metadata.create_all(engine())
    with Session(engine()) as db:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            return
        owner = User(email=DEMO_EMAIL, password_hash=hasher.hash(DEMO_PASSWORD))
        db.add(owner)
        db.flush()
        business = Business(
            owner_id=owner.id, name="Sunny Salon", slug="sunny-salon",
            hours=[OpeningHours(weekday=d, opens=time(10), closes=time(19)) for d in range(6)],  # closed Sundays
        )
        db.add(business)
        db.flush()
        db.add_all([
            Service(business_id=business.id, name="Haircut", duration_min=45, price_thb=350),
            Service(business_id=business.id, name="Hair colouring", duration_min=120, price_thb=1500),
            Service(business_id=business.id, name="Thai head massage", duration_min=30, price_thb=250),
        ])
        db.commit()


if __name__ == "__main__":
    seed()
    print(f"Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
