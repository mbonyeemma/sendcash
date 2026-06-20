# SendiCash Admin

Internal admin panel for SendiCash — separate Vite + React app so admin code is never bundled into the public user wallet (`../web`).

## Features

- **Dashboard** — KPIs (profit, volume, users, pending tx) + 30-day volume/profit and signup charts
- **Transactions** — filter by status / type / date range
- **Users** — search, view wallet balances, reset password, delete
- **Profits** — gross/net profit, provider costs, breakdown by type & currency
- **Balances** — live Relworx mobile-money balance and on-chain treasury/offramp-custody balances (XRP + RLUSD)
- **Exchange Rates**, **Payment Types** (CRUD), **System Users** (admin CRUD), **Settings** (change password, sweep config, deposit addresses)

## Run

```bash
cd admin
npm install          # or: bun install
cp .env.example .env # set VITE_API_URL to your API
npm run dev          # http://localhost:5174
npm run build        # production build to dist/
```

## Auth

Uses the API's `/admin/login` JWT endpoint. The token is stored in `localStorage` and sent as a Bearer token.

First-time bootstrap of the default admin (API side):

```bash
# In the API env: ALLOW_DEFAULT_ADMIN=true, DEFAULT_ADMIN_EMAIL=..., DEFAULT_ADMIN_PASSWORD=...
curl -X POST $API/admin/init-default-admin
```

## Backend endpoints used

All under `/admin` (see `../api/src/routes/admin.ts`). Analytics (`/analytics/overview`, `/analytics/profit`, `/analytics/timeseries`) and balances (`/balances/relworx`, `/balances/treasury`) were added alongside this app.
