# Golf Charity Subscription Platform

Full-stack monorepo for a golf subscription product with charity funding, monthly draws, and winner verification.

## Structure

- `backend/` Express API + Supabase + Stripe
- `frontend/` React + Vite + Tailwind client
- `shared/` shared schemas/types (placeholder)
- `docs/` setup and delivery notes

## Quick Start

1. Backend
   - `cd backend`
   - `cp .env.example .env`
   - Fill Supabase + Stripe values
   - `npm install`
   - `npm run dev`

2. Frontend
   - `cd frontend`
   - `cp .env.example .env`
   - `npm install`
   - `npm run dev`

3. Database
   - Open Supabase SQL Editor
   - Run: `backend/supabase/migrations/001_init_schema.sql`

## Core API Groups

- `/api/auth`
- `/api/subscriptions`
- `/api/scores`
- `/api/charities`
- `/api/draws`
- `/api/winners`

## Notes

- Stripe webhooks rely on raw request body capture in `backend/src/app.js`.
- `users.password_hash` exists for app-level login flow in this scaffold.
- Apply stricter schema validation and test coverage before production launch.
