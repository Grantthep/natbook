import os
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from .models import User
from .ratelimit import login_limit, register_limit
from .schemas import Credentials, UserOut

COOKIE = "session"
TOKEN_TTL = timedelta(days=7)
# Signs login tokens. It must be the same for every server process and survive restarts,
# so there's no random fallback: a missing key would log people out at random.
SECRET = os.getenv("SECRET_KEY", "")
if len(SECRET) < 16:
    raise RuntimeError("Set SECRET_KEY to a long random string (dev.py and the tests set one for you)")

hasher = PasswordHasher()
DUMMY_HASH = hasher.hash("not-a-real-password")
router = APIRouter()


def _start_session(response: Response, user: User):
    token = jwt.encode({"sub": str(user.id), "exp": datetime.now(UTC) + TOKEN_TTL}, SECRET, algorithm="HS256")
    response.set_cookie(
        COOKIE, token, max_age=int(TOKEN_TTL.total_seconds()), httponly=True, samesite="lax",
        secure=os.getenv("COOKIE_SECURE", "true") == "true",
    )


def current_user(session: str | None = Cookie(default=None), db: Session = Depends(get_db)) -> User:
    try:
        user_id = int(jwt.decode(session or "", SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, "Please log in")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, "Please log in")
    return user


@router.post("/register", response_model=UserOut, status_code=201, dependencies=[Depends(register_limit)])
def register(body: Credentials, response: Response, db: Session = Depends(get_db)):
    user = User(email=body.email.lower(), password_hash=hasher.hash(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        raise HTTPException(409, "An account with this email already exists")
    _start_session(response, user)
    return user


@router.post("/login", response_model=UserOut, dependencies=[Depends(login_limit)])
def login(body: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    try:
        # Check against a dummy hash for unknown emails so response time doesn't reveal which emails exist.
        hasher.verify(user.password_hash if user else DUMMY_HASH, body.password)
        if not user:
            raise VerificationError
    except (VerificationError, InvalidHashError):
        raise HTTPException(401, "Wrong email or password")
    _start_session(response, user)
    return user


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user
