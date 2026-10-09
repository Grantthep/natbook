import os
from functools import cache

from sqlalchemy import create_engine
from sqlalchemy.orm import Session


@cache
def engine():
    # Neon/Render hand out postgres:// URLs; SQLAlchemy needs the driver name.
    url = os.environ["DATABASE_URL"]
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            url = "postgresql+psycopg://" + url[len(prefix):]
    return create_engine(url, pool_pre_ping=True)


def get_db():
    with Session(engine()) as db:
        yield db
