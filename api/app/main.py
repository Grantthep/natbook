from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import auth, owner, public
from .db import engine
from .models import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # shortcut: create_all instead of migrations; add Alembic before the first schema change after launch.
    Base.metadata.create_all(engine())
    yield


app = FastAPI(title="NatBook API", lifespan=lifespan)
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(owner.router, prefix="/api/business", tags=["owner"])
app.include_router(public.router, prefix="/api/public", tags=["public"])


@app.get("/api/health")
def health():
    return {"ok": True}
