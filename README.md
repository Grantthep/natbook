# NatBook

A booking marketplace for Bangkok, in the spirit of QueQ. Customers browse salons, massage shops, nail studios, clinics, dentists, gyms, tutors and pet groomers, search by service or area, and book a free time slot in a few taps. Each shop owner manages their services, opening hours, shop details and bookings from a dashboard.

*Nat (นัด) is Thai for "appointment".*

**Stack:** FastAPI · PostgreSQL · SQLAlchemy · React · TypeScript · TanStack Query · Tailwind CSS · GitHub Actions

## How it works for owners and customers

1. **A shop owner signs up** at `/register`, creates their shop (name, category, area, description) and adds services and opening hours.
2. **The shop gets its own booking link** (`/b/your-shop`) to share on LINE, Instagram or Google Maps, and it appears in the marketplace at `/`.
3. **Customers book** a free time slot from the marketplace or the link. No account needed.
4. **The owner receives the booking** on their dashboard, which updates automatically and marks new bookings.
5. **Customers can view or cancel** from *My bookings*. Each booking has a private link, and the browser remembers the links, so customers don't need an account. A cancelled booking frees the time slot and shows as cancelled on the owner's dashboard.

A new install starts with no shops. For testing or screenshots, `python dev.py --demo` adds 10 sample shops around Bangkok, with the sample owner login `demo@natbook.app` / `demo-password`.

## Highlights

- **Double bookings are impossible.** A Postgres exclusion constraint rejects any two confirmed bookings for the same business whose times overlap. It still holds when two customers press "Book" at the same instant, because the rule lives in the database, not just in the API code. There's a test that writes straight to the database to prove it.
- **Timezones are handled correctly.** Times are stored in UTC and shown in the business's timezone (Asia/Bangkok by default), whatever timezone the customer's device uses. Slot calculation stays correct across daylight-saving changes, and that's tested too.
- **Each business sees only its own data.** Every owner action is scoped to the owner's business, and there's a test confirming one owner can't cancel another business's bookings.
- **Customers manage bookings without accounts.** Each booking gets a random 256-bit token, and only someone holding the private link can view or cancel it. The owner's API never returns these tokens.
- **Secure login.** Passwords are hashed with Argon2, and sessions are signed tokens in httpOnly cookies. Unknown emails take the same time to reject as wrong passwords, so attackers can't use timing to find out which emails have accounts.

## How it works

```
web/  React + TypeScript (Vite)       api/  FastAPI + SQLAlchemy
  /               marketplace + search  app/auth.py    register, login, logout
  /register       owner sign-up         app/owner.py   business, services, hours, bookings
  /dashboard      owner dashboard       app/public.py  shop list + search, free slots, book
  /b/:slug        customer booking      app/slots.py   free-slot calculation
  /my-bookings    customer's bookings
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

Use `python dev.py --demo` to start with sample shops instead of an empty marketplace.

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
- [ ] Shop photos and customer reviews
- [ ] Password reset for shop owners
- [ ] LINE notifications
- [ ] Flutter customer app using the same API
