# SendiCash Frontends (monorepo)

This repository contains the two SendiCash web frontends:

| Folder    | App                | Description                                              | Dev port |
| --------- | ------------------ | -------------------------------------------------------- | -------- |
| [`web`](web)     | User wallet        | Public-facing wallet app (Vite + React + shadcn/ui)     | 5173     |
| [`admin`](admin) | Admin panel        | Internal admin dashboard (transactions, users, profits, balances) | 5174 |

Both talk to the SendiCash API (`sendcash-be`) via `VITE_API_URL`.

## Setup

This is an npm-workspaces monorepo.

```bash
npm install            # installs deps for both workspaces
```

Each app keeps its own `.env` (copy from the respective `.env.example` where present).

## Develop

```bash
npm run dev:web        # user wallet  -> http://localhost:5173
npm run dev:admin      # admin panel  -> http://localhost:5174
```

## Build

```bash
npm run build          # builds both
npm run build:web
npm run build:admin
```

## Deploy notes

The user app previously deployed from the repo root. Since it now lives in `web/`,
update your hosting "root directory" / build settings to point at `web/` (and add a
separate project for `admin/`). The user app's `vercel.json` moved to `web/vercel.json`.
