from datetime import datetime, time

from sqlalchemy import DDL, CheckConstraint, DateTime, ForeignKey, String, UniqueConstraint, event, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Bangkok")
    services: Mapped[list["Service"]] = relationship(order_by="Service.id")
    hours: Mapped[list["OpeningHours"]] = relationship(order_by="OpeningHours.weekday", cascade="all, delete-orphan")


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("duration_min BETWEEN 5 AND 480"),
        CheckConstraint("price_thb >= 0"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    duration_min: Mapped[int]
    price_thb: Mapped[int]
    active: Mapped[bool] = mapped_column(default=True)


class OpeningHours(Base):
    __tablename__ = "opening_hours"
    __table_args__ = (
        UniqueConstraint("business_id", "weekday"),
        CheckConstraint("weekday BETWEEN 0 AND 6"),
        CheckConstraint("opens < closes"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    weekday: Mapped[int]  # 0 = Monday, like date.weekday()
    opens: Mapped[time]
    closes: Mapped[time]


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (CheckConstraint("ends_at > starts_at"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"))
    customer_name: Mapped[str] = mapped_column(String(100))
    customer_email: Mapped[str] = mapped_column(String(254))
    customer_phone: Mapped[str | None] = mapped_column(String(30))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(12), default="confirmed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    service: Mapped[Service] = relationship()

    @property
    def service_name(self):
        return self.service.name


# The database itself refuses overlapping confirmed bookings for a business, so two
# customers clicking "Book" at the same moment can't both win. business_id is wrapped
# in a one-value range because plain integers need the btree_gist extension for GiST.
event.listen(Booking.__table__, "after_create", DDL("""
    ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        int4range(business_id, business_id, '[]') WITH &&,
        tstzrange(starts_at, ends_at) WITH &&
    ) WHERE (status <> 'cancelled')
"""))
