import os
import tempfile

import pytest

# Tests need real Postgres (the overlap rule is a Postgres feature). CI provides one through
# DATABASE_URL; locally we start a throwaway one.
if "DATABASE_URL" not in os.environ:
    import pgserver

    _server = pgserver.get_server(tempfile.mkdtemp(), cleanup_mode="stop")
    os.environ["DATABASE_URL"] = _server.get_uri()
os.environ["COOKIE_SECURE"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
    with engine().begin() as conn:
        conn.exec_driver_sql("TRUNCATE users, businesses, services, opening_hours, bookings RESTART IDENTITY CASCADE")
