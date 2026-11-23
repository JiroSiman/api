# FileShare — Self-Hosted (No GitHub, No Cloudflare)

Stack: **Node.js + Express** on your own machine or VPS. Files are zipped server-side and saved to **your disk** — so storage is limited only by your hard drive, not a 25 MB KV cap. Free domain via **DuckDNS** (or your VPS host's free subdomain).

## 1. Install & run locally

```powershell
cd C:\Users\SIMAN\Desktop\api
npm install
npm start
```

Open `http://localhost:3000`. Upload → get a code → open `/download/<code>` to download the zip.

## 2. Free domain options

### Option A — DuckDNS (free, works on any PC)
1. Create a free account at `duckdns.org`.
2. Pick a hostname, e.g. `mysite.duckdns.org` (copy the update URL/token).
3. On the PC running the app, open router port **3000** (port-forward) to that PC's LAN IP.
4. Keep DuckDNS updated so the domain resolves to your public IP:
   - Windows: `schtasks` or a small batch that runs `curl "https://www.duckdns.org/update?domains=mysite&token=YOUR_TOKEN"` every 5 min.
5. Receiver opens `https://mysite.duckdns.org/download/<code>`.

> Note: free residential IPs often block inbound ports. If the router blocks it, use Option B.

### Option B — Free-tier VPS with a free subdomain
Deploy the same folder to any of these (all free subdomains, no GitHub/Cloudflare needed for the *frontend*):
- **Render** → `*.onrender.com`
- **Railway** → `*.up.railway.app`
- **Fly.io** → `*.fly.dev`

Upload the project via their CLI (`render deploy`, `railway up`, `fly launch`), set start command to `npm start`.
Caveat: free VPS tiers usually give **limited disk (≈512 MB–1 GB)** and may sleep. For true GBs, self-host (Option A) or buy a small VPS (~$5/mo).

## 3. Production notes
- Run behind a reverse proxy (Caddy/nginx) for HTTPS if you use DuckDNS:
  - Caddy: `mysite.duckdns.org { reverse_proxy localhost:3000 }` (auto-TLS).
- Persist `uploads/` and `store.json` (back them up) — that's your actual data.
- Increase Node memory for huge uploads: `node --max-old-space-size=4096 server.js`.
- Set an expiry sweep: files are tagged with `createdAt`; add a cron job to delete old `.zip` + `store.json` entries after 7 days.

## 4. Endpoints
- `GET /` — web UI
- `POST /upload` (multipart `files[]`, optional `code`) → `{ ok, code, downloadUrl }`
- `GET /download/:code` — the zip
- `GET /api/codes` — list of active codes

## Project layout
```
package.json
server.js
public/index.html
public/app.js
DEPLOY.md
```
