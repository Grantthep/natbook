"""Sample shops around Bangkok for local testing and screenshots, never for production:
python dev.py --demo   (or  python -m app.seed  against any database you don't care about)"""
import secrets
from datetime import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hasher
from .db import engine
from .models import Base, Business, OpeningHours, Service, User

DEMO_EMAIL = "demo@natbook.app"
DEMO_PASSWORD = "demo-password"

WEEKDAYS, MON_SAT, EVERY_DAY = range(5), range(6), range(7)

# (name, slug, category, area, description, open days, opens, closes, [(service, minutes, ฿)])
SHOPS = [
    ("Sunny Salon", "sunny-salon", "salon", "Sukhumvit 24",
     "Friendly neighbourhood salon for cuts, colour and Thai head massage.", MON_SAT, 10, 19,
     [("Haircut", 45, 350), ("Hair colouring", 120, 1500), ("Thai head massage", 30, 250)]),
    ("Baan Thai Massage", "baan-thai-massage", "spa", "Ari",
     "Traditional Thai massage in a quiet wooden house, five minutes from BTS Ari.", EVERY_DAY, 10, 22,
     [("Thai massage", 60, 350), ("Foot massage", 45, 250), ("Oil massage", 90, 700)]),
    ("Lotus Nail Studio", "lotus-nail-studio", "nails", "Siam",
     "Gel nails, nail art and pedicures in the heart of Siam.", EVERY_DAY, 11, 21,
     [("Gel manicure", 60, 550), ("Spa pedicure", 45, 450), ("Nail art (both hands)", 90, 900)]),
    ("Smile Dental Clinic", "smile-dental-clinic", "dental", "Silom",
     "English-speaking dentists for check-ups, cleaning and whitening.", MON_SAT, 9, 18,
     [("Check-up and cleaning", 45, 1200), ("Teeth whitening", 90, 6500), ("Consultation", 20, 300)]),
    ("CityCare Clinic", "citycare-clinic", "clinic", "Bang Na",
     "Walk-in style GP clinic with online appointments and same-day health checks.", MON_SAT, 8, 20,
     [("GP consultation", 20, 500), ("Basic health check", 60, 2500), ("Vaccination", 15, 800)]),
    ("Iron Lab Gym", "iron-lab-gym", "fitness", "Thonglor",
     "Personal training and Muay Thai classes with certified coaches.", EVERY_DAY, 7, 21,
     [("Personal training", 60, 1200), ("Muay Thai class", 90, 600), ("Body assessment", 30, 400)]),
    ("Bright Tutors", "bright-tutors", "tutor", "Lat Phrao",
     "One-to-one tutoring for school maths, science and IELTS.", WEEKDAYS, 15, 21,
     [("Maths lesson", 60, 600), ("IELTS speaking practice", 60, 800), ("Science lesson", 60, 600)]),
    ("Happy Paws Grooming", "happy-paws-grooming", "pet", "Ekkamai",
     "Gentle grooming for dogs and cats, with pickup available.", MON_SAT, 9, 18,
     [("Bath and brush", 60, 500), ("Full groom", 120, 1200), ("Nail trim", 15, 150)]),
    ("Mint Barber", "mint-barber", "salon", "Ari",
     "Classic barbershop for fades, beard trims and hot towel shaves.", EVERY_DAY, 11, 20,
     [("Men's haircut", 30, 250), ("Cut and shave", 60, 450), ("Beard trim", 15, 150)]),
    ("Zen Spa Riverside", "zen-spa-riverside", "spa", "Charoen Krung",
     "Riverside day spa for aromatherapy and hot stone treatments.", EVERY_DAY, 10, 21,
     [("Aromatherapy massage", 90, 1500), ("Hot stone massage", 120, 2200), ("Herbal compress", 60, 1000)]),
]


def seed():
    Base.metadata.create_all(engine())
    with Session(engine()) as db:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            return
        for i, (name, slug, category, area, description, days, opens, closes, services) in enumerate(SHOPS):
            # The first shop belongs to the demo login; the rest get owners nobody can log in as.
            email, password = (DEMO_EMAIL, DEMO_PASSWORD) if i == 0 else (f"{slug}@demo.natbook.app", secrets.token_hex())
            owner = User(email=email, password_hash=hasher.hash(password))
            db.add(owner)
            db.flush()
            db.add(Business(
                owner_id=owner.id, name=name, slug=slug, category=category, area=area, description=description,
                hours=[OpeningHours(weekday=d, opens=time(opens), closes=time(closes)) for d in days],
                services=[Service(name=n, duration_min=m, price_thb=p) for n, m, p in services],
            ))
        db.commit()


if __name__ == "__main__":
    seed()
    print(f"Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}")
