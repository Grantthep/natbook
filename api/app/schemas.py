from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from pydantic import AwareDatetime, BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str


class BusinessIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(pattern=r"^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$")
    timezone: str = "Asia/Bangkok"

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, v):
        try:
            ZoneInfo(v)
        except Exception:
            raise ValueError("unknown timezone")
        return v


class HoursIn(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    weekday: int = Field(ge=0, le=6)
    opens: time
    closes: time

    @model_validator(mode="after")
    def opens_before_closes(self):
        if self.opens >= self.closes:
            raise ValueError("opens must be before closes")
        return self


class ServiceIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    duration_min: int = Field(ge=5, le=480)
    price_thb: int = Field(ge=0, le=1_000_000)


class ServiceOut(ServiceIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class BusinessOut(BaseModel):
    name: str
    slug: str
    timezone: str
    services: list[ServiceOut]
    hours: list[HoursIn]


class SlotsOut(BaseModel):
    date: date
    slots: list[datetime]


class BookingIn(BaseModel):
    service_id: int
    starts_at: AwareDatetime
    customer_name: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr
    customer_phone: str | None = Field(default=None, max_length=30)


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    service_id: int
    service_name: str
    customer_name: str
    customer_email: str
    customer_phone: str | None
    starts_at: datetime
    ends_at: datetime
    status: str
