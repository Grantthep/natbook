# NatBook

Online booking for small businesses in Thailand: salons, massage shops, tutors and studios. Each business gets its own booking page where customers pick a service and a free time slot. The owner manages services, opening hours and bookings from a dashboard.

*Nat (นัด) is Thai for "appointment".*

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · React · TypeScript · TanStack Query · Tailwind CSS · GitHub Actions

## Try it

- **Demo booking page:** `/b/sunny-salon`
- **Demo owner login:** `demo@natbook.app` / `demo-password`

## Highlights

- **Double bookings are impossible.** A Postgres exclusion constraint rejects any two confirmed bookings for the same business whose times overlap. It still holds when two customers press "Book" at the same instant, because the rule lives in the database, not just in the API code. There's a test that writes straight to the database to prove it.
- **Timezones are handled correctly.** Times are stored in UTC and shown in the business's timezone (Asia/Bangkok by default), whatever timezone the customer's device uses. Slot calculation stays correct across daylight-saving changes, and that's tested too.
- **Each business sees only its own data.** Every owner action is scoped to the owner's business, and there's a test confirming one owner can't cancel another business's bookings.
- **Secure login.** Passwords are hashed with Argon2, and sessions are signed tokens in httpOnly cookies. Unknown emails take the same time to reject as wrong passwords, so attackers can't use timing to find out which emails have accounts.

## How it works

```
web/  React + TypeScript (Vite)       api/  FastAPI + SQLAlchemy
  /               landing page          app/auth.py    register, login, logout
  /register       owner sign-up         app/owner.py   business, services, hours, bookings
  /dashboard      owner dashboard       app/public.py  booking page, free slots, book
  /b/:slug        customer booking      app/slots.py   free-slot calculation
                                        app/models.py  tables + no-overlap constraint
```

The web app calls `/api/...` on its own domain: Vite proxies these calls in development, and a hosting rewrite does it in production. That keeps the login cookie same-site.

## Run it locally

You need Python 3.11+ and Node 22+. No Docker or Postgres install is needed: `dev.py` starts a local Postgres for you.

```bash
# API: http://localhost:8000/docs
cd api
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
python dev.py

# Web app: http://localhost:5173   (in a second terminal)
cd web
npm install
npm run dev
```

Running `dev.py` creates the demo account and the Sunny Salon booking page.

## Tests

```bash
cd api && pytest      # slot logic, booking flow, overlap constraint, auth, data isolation
cd web && npm run build && npm run lint
```

GitHub Actions runs both on every push.

## Roadmap

- [ ] Deploy (Render + Neon + Vercel)
- [ ] Email confirmations and reminders (Resend + cron)
- [ ] PromptPay deposits with Stripe
- [ ] Multiple staff members per business
- [ ] Thai / English language switch
- [ ] LINE notifications
- [ ] Flutter customer app using the same API
