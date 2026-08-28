# Deployment — HTTP Learning Checker

This app is a **Next.js App Router** project with **Node.js API routes** (`/api/validate`, `/api/encode`, `/api/send`, `/api/ws`, `/api/mqtt`, `/api/http3-support`). It is **not** a static export — Validate, Encode, and Send require a server runtime.

**Current release:** v0.8.1 (see [CHANGELOG.md](./CHANGELOG.md)).

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | `>= 20` (`package.json` `engines`) |
| **npm** | `npm ci` for reproducible CI/local builds |
| **Git** | Vercel / Netlify deploy from repository |

Optional CLI: `npx vercel`, `npx netlify-cli`.

## Pre-deploy check (all targets)

Run the idempotent gate script before tagging a release or pushing to production:

```bash
chmod +x scripts/deploy-check.sh   # once
./scripts/deploy-check.sh
```

Equivalent npm script:

```bash
npm run deploy:check
```

The script runs `npm ci`, `tsc --noEmit`, and `next build`. Fix any failure before deploying.

Local smoke test after build:

```bash
npm start
# open http://localhost:3000
```

## Vercel

Config: [`vercel.json`](./vercel.json)

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Install | `npm ci` |
| Build | `npm run build` |
| Region | `iad1` (config default) |

### Steps

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. [Import project](https://vercel.com/new) → Framework preset **Next.js** (auto-detected).
3. Deploy. No extra env vars required for basic teaching use.

CLI:

```bash
npx vercel          # preview
npx vercel --prod   # production
```

### Serverless notes

- API routes set `maxDuration` (Send / WS / MQTT: 60s; validate/encode: 30s). Hobby plans may cap lower — upgrade if demos time out.
- **HTTP/3** live Send depends on the function runtime; Encode/QPACK always works client-side.
- **Outbound proxy** — `/api/send` opens connections to user-entered URLs. Deploy only for **trusted** audiences; SSRF guards apply but public open proxies invite abuse.

## Netlify

Config: [`netlify.toml`](./netlify.toml) + devDependency `@netlify/plugin-nextjs`

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node | `20` (`build.environment`) |

### Steps

1. [New site from Git](https://app.netlify.com/) or link existing repo.
2. Netlify reads `netlify.toml`; the Next.js plugin adapts App Router routes to Functions.
3. Deploy.

CLI:

```bash
npx netlify deploy --build        # draft
npx netlify deploy --build --prod # production
```

Same serverless limits as Vercel (timeouts, HTTP/3, SSRF) apply.

## Self-hosted (VM / container)

For a private classroom or lab network, run the production Node server behind your own reverse proxy.

### 1. Build on the host

```bash
git clone <your-repo-url> http_checker
cd http_checker
./scripts/deploy-check.sh
```

### 2. Run with systemd (example)

Create `/etc/systemd/system/http-checker.service`:

```ini
[Unit]
Description=HTTP Learning Checker (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/http_checker
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now http-checker
```

### 3. nginx reverse proxy (optional)

Add a **new** site only — do not edit unrelated `server` blocks.

```nginx
server {
    listen 443 ssl http2;
    server_name checker.example.com;

    # Use your existing cert paths (Let's Encrypt, etc.)
    ssl_certificate     /etc/letsencrypt/live/checker.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/checker.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # WebSocket relay (/api/ws)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

HTTP-only verify (before TLS):

```nginx
server {
    listen 80;
    server_name checker.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

Reload nginx after adding the site: `sudo nginx -t && sudo systemctl reload nginx`.

### Docker (minimal)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t http-checker .
docker run -p 3000:3000 http-checker
```

Put nginx or another gateway in front for HTTPS in production.

## What ships in static assets

| Path | Purpose |
|------|---------|
| `public/theme-init.js` | Dark-mode bootstrap (`beforeInteractive` script) |
| `.next/` | Next.js build output (not served directly on Vercel/Netlify) |

Teach labs (`teach.local` JWT / If-Modified-Since) run **in the API process** — no extra services.

## Post-deploy smoke test

1. Open `/` — **Lab** mode loads; **Learn…** opens drawer.
2. **httpbin GET** preset → Validate → Encode → Send.
3. **Compare… → 2 vs 3** — Wire tab callout; **Learn…** opens with **HTTP/1.1–3 multiplexing** and **Simulate load** highlighted.
4. **Lab: JWT Bearer** — 200 from `teach.local` (no outbound network).
5. Optional: **WebSocket echo** preset → Send.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Build fails on `tsc` | Fix TypeScript errors locally; re-run `./scripts/deploy-check.sh` |
| Send times out | Platform function duration cap; try shorter targets or higher plan |
| HTTP/3 Send fails | Expected on some serverless hosts; use Encode/Compare for teaching |
| Blank page / theme flash | Ensure `public/theme-init.js` is deployed (v0.8.0+) |
| Compare opens Learn but no simulator | Hard refresh; v0.8.1+ pins multiplex section at top of Learn drawer |

## Security

- Do not expose to the public internet without understanding **SSRF** risk on `/api/send`.
- No server-side credential storage; cookie jar and collections are browser `localStorage` / `sessionStorage` only.
- Block private targets by default; users must opt in to **Allow private targets**.

## Related docs

- [README.md](./README.md) — features, learning path, architecture
- [CHANGELOG.md](./CHANGELOG.md) — release notes
