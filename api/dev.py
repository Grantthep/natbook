"""Run the API locally with a built-in Postgres, no Docker needed:  python dev.py
API docs: http://localhost:8000/docs"""
import os
from pathlib import Path

if __name__ == "__main__":  # Windows re-imports this file in the reload process
    if "DATABASE_URL" not in os.environ:
        import pgserver

        server = pgserver.get_server(Path(__file__).with_name(".pgdata"), cleanup_mode="stop")
        os.environ["DATABASE_URL"] = server.get_uri()
    os.environ.setdefault("COOKIE_SECURE", "false")  # local dev runs on plain http
    os.environ.setdefault("SECRET_KEY", "dev-only-secret")  # keeps you logged in across reloads
    os.environ.setdefault("SEED_DEMO", "true")  # create the demo shops on startup

    import uvicorn

    from app.seed import DEMO_EMAIL, DEMO_PASSWORD

    print(f"Demo login: {DEMO_EMAIL} / {DEMO_PASSWORD}   Docs: http://localhost:8000/docs")
    uvicorn.run("app.main:app", port=8000, reload=True)
