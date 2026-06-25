# SendiCash Frontends

Two separate apps in this repo — run each from its own folder:

| Folder | App | Dev port |
| ------ | --- | -------- |
| [`web`](web) | User wallet (Vite + React) | 5173 |
| [`admin`](admin) | Admin panel | 5174 |

Both use `VITE_API_URL` to talk to the SendiCash API.

## User wallet (`web/`)

```bash
cd web
npm install
npm run dev
```

Deploy with Vercel **Root Directory** set to `web`.

## Admin (`admin/`)

```bash
cd admin
npm install
npm run dev
```

Deploy as a separate Vercel project with **Root Directory** set to `admin`.
