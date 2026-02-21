# Syr's M+ Helper — Project Context

> This file is the persistent memory for Claude sessions. Read it at the start of any new chat to get full context without re-reading the codebase. Update it when significant changes are made.

**Last updated:** 2026-02-20 (GitHub Pages + Cloudflare Worker deployment live; UX fixes)

---

## Purpose

A World of Warcraft Mythic+ score calculator. The user enters a character name, realm, and region. The app fetches their current M+ scores from the Blizzard API, then calculates the most efficient runs to reach a user-specified target score. Two path modes: **Quickest** (fewest runs, highest keys) and **Easiest** (lowest key level that can still reach target).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Single HTML file — React 18 (CDN), Babel standalone (JSX in-browser) |
| Local dev server | `server.py` — Python stdlib only, no npm/pip needed |
| Auth | Blizzard OAuth2 `client_credentials` flow (server-side only) |
| Hosting targets | Vercel (primary), Cloudflare Worker (proxy alt), GitHub Pages (static, no API) |

---

## File Structure

```
syrs-mplus-helper/
├── index.html                   ← The entire app (React SPA, single file)
├── server.py                    ← Local dev: serves HTML + proxies Blizzard API with OAuth2
├── api/
│   └── proxy.js                 ← Vercel serverless function (Blizzard OAuth2 proxy)
├── worker/
│   ├── index.js                 ← Cloudflare Worker (Blizzard OAuth2 proxy, alternative)
│   └── wrangler.toml            ← Cloudflare Worker config
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml     ← GitHub Actions: deploy static HTML to gh-pages branch
│       └── deploy-worker.yml    ← GitHub Actions: deploy Cloudflare Worker with secrets
├── vercel.json                  ← Vercel config (no build step needed, routes /api/*)
├── VERCEL_DEPLOYMENT.md         ← Vercel setup guide (current, Blizzard API)
├── PROJECT_CONTEXT.md           ← THIS FILE
├── .env                         ← Local secrets (gitignored): BLIZZARD_CLIENT_ID/SECRET
└── .gitignore
```

---

## Development History

### Phase 1 — Initial (Cloudflare + Raider.io era)

- App started with **Raider.io API** (public, no auth needed, CORS-friendly in theory)
- Browser CORS blocked direct Raider.io requests
- Set up **Cloudflare Worker** as CORS proxy → deployed via GitHub Actions
- Raider.io **blocked server-side fetch** (returned HTML/403, bot detection)
- Tried adding `User-Agent` browser headers → still blocked
- Tried a Raider.io API key via GitHub Actions Secrets → still blocked at server level
- Multiple wrangler.toml / secrets iterations; added debug endpoint to verify API key loading

### Phase 2 — Vercel + still Raider.io

- Added **Vercel serverless function** (`api/proxy.js`) as an alternative proxy
- Same problem: Raider.io blocked server-side fetch regardless of headers
- Briefly used a **public CORS proxy** (`cors.sh` or similar) as a workaround — unreliable, not suitable for production
- Added **local dev server** (`server.js` Node.js, then replaced with `server.py` Python)
- `server.js` is now deleted (obsolete); `proxy-server.js` (Express version) also deleted

### Phase 3 — Migration to Blizzard API (current architecture)

- Raider.io was completely unreliable for any server-side proxy approach
- Migrated to **official Blizzard WoW API** (`*.api.blizzard.com`)
- Requires **OAuth2 `client_credentials` grant** — needs `BLIZZARD_CLIENT_ID` + `BLIZZARD_CLIENT_SECRET`
- Credentials must stay server-side (proxy) — cannot be exposed in browser JS
- Rewrote `server.py` with full Blizzard OAuth2 token exchange + caching
- Rewrote `worker/index.js` with Blizzard OAuth2 (reads secrets from Cloudflare Worker env)
- Rewrote `api/proxy.js` with Blizzard OAuth2 (reads from Vercel env vars)
- Rewrote the app HTML to call Blizzard API endpoints instead of Raider.io
- Deleted old `index.html` duplicate; main app file later renamed to `index.html`

### Phase 4 — Feature Development (current)

UI/UX features added in this phase:
- Two-column layout: 40% left (filter panel) / 60% right (results)
- Compact dungeon score rows in left panel (after paths calculated)
- Per-dungeon rank-based 8-color gradient for score display
- Automatic current season detection via Blizzard API leaderboard index
- Realm autocomplete from Blizzard API (all regions)
- Saved searches in browser cookies (90-day expiry, max 10)
- Auto-save character on successful lookup
- Light/dark theme toggle
- Path calculation: greedy algorithm, two modes (quickest / easiest)
- Pre-calculation state: character banner + scores shown in right (60%) panel
- Post-calculation: scores move to left panel, paths fill right panel
- Smooth CSS animations for expand/collapse filter sections
- Auto-capitalize first letter of character name inputs
- Target M+ Score + Max Key Level on same line in filter panel
- Stronger light-mode text shadows on colored score elements
- Single-click submit always does full lookup + path calc when target score is set
- Enter key submits from any input field (character name, realm, target score, max key level)
- "points" label shown next to score gain (+xxx) in path suggestion panels

---

## Deployment Status

| Target | Status | Notes |
|--------|--------|-------|
| **Local (`server.py`)** | ✅ Working | Needs `.env` with Blizzard credentials |
| **Vercel** | ⚠️ Ready to try | `api/proxy.js` updated for Blizzard OAuth2. Set env vars in Vercel dashboard before deploying. |
| **Cloudflare Worker** | ✅ Working | Deployed as `syrs-mplus-helper-proxy.diabtraders.workers.dev`. Secrets set via GitHub Actions (`CF_API_TOKEN`, `CF_ACCOUNT_ID`, `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`). |
| **GitHub Pages** | ✅ Working | Serves static `index.html`; API calls routed to Cloudflare Worker proxy. Live at `https://diab64.github.io/syrs-mplus-helper/` |

---

## Blizzard API Reference

**OAuth endpoint:** `POST https://oauth.battle.net/token`
- Body: `grant_type=client_credentials`
- Auth: `Basic base64(CLIENT_ID:CLIENT_SECRET)`
- Returns: `{ access_token, expires_in }` (token valid ~24h)

**API base hosts:** `{region}.api.blizzard.com` where region ∈ {us, eu, kr, tw}

**Key endpoints used:**

| Endpoint | Purpose |
|----------|---------|
| `GET /data/wow/realm/index?namespace=dynamic-{r}&locale=en_US` | Realm list for autocomplete |
| `GET /data/wow/mythic-keystone/season/index?namespace=dynamic-us` | Current season ID |
| `GET /data/wow/connected-realm/11/mythic-leaderboard/index?namespace=dynamic-us` | Active dungeon list (realm 11 = Stormrage US) |
| `GET /data/wow/mythic-keystone/dungeon/{id}?namespace=dynamic-us` | Dungeon timer details |
| `GET /profile/wow/character/{realm}/{name}?namespace=profile-{r}` | Character profile + class |
| `GET /profile/wow/character/{realm}/{name}/mythic-keystone-profile` | Overall current M+ rating |
| `GET /profile/wow/character/{realm}/{name}/mythic-keystone-profile/season/{id}` | Season best_runs |
| `GET /profile/wow/character/{realm}/{name}/character-media` | Avatar URL |

**Dungeon icons:** `https://render.worldofwarcraft.com/us/zones/{slug}-small.jpg`
- Some API slugs don't match image slugs — handled by `DUNGEON_IMAGE_SLUGS` map in the HTML

**Score source:** `run.map_rating.rating` from `best_runs` (actual Blizzard rating, not calculated)

**Stars from duration:**
- `duration <= timer * 0.60` → 3 stars
- `duration <= timer * 0.80` → 2 stars
- `duration <= timer * 1.00` → 1 star
- `duration > timer` → 0 stars (overtime)

---

## Score Calculation Logic

- `calcRunScore(keyLevel, stars)` estimates what a run would score (for path suggestions)
  - Base: `155 + (keyLevel - 2) * 18.33`
  - +15 for 3★, +7.5 for 2★, +1.875 for 1★, −15 for overtime
- Path algorithm (`findPaths` → `greedyPath`):
  1. Sort candidates by highest `scoreGain` descending
  2. Greedy pick one per dungeon until target is met
  3. Second pass: try to lower each key level while still meeting target
- Two modes: **Quickest** (fewest runs possible) and **Easiest** (lowest max key level)
- 8-color gradient: scores ranked among unique values, mapped to `colorMap[1..8]`

---

## Local Dev Quick Start

```bash
# One-time: create .env
echo "BLIZZARD_CLIENT_ID=your_id" > .env
echo "BLIZZARD_CLIENT_SECRET=your_secret" >> .env

# Run
python server.py
# Open http://localhost:3000
```

---

## Known Issues / TODOs

- `console.log` debug statements still throughout `index.html` — strip before production
- Score estimation (`calcRunScore`) uses an approximation, not Blizzard's exact formula
- Dungeon icon slug mismatches handled by a manual map (`DUNGEON_IMAGE_SLUGS`) — may need updates for new seasons
- `deploy-pages.yml` (GitHub Pages) deploys but the site won't function without a proxy backend
- Vercel deployment not yet tested end-to-end with Blizzard credentials
- Cloudflare Worker deployment not yet re-tested since Blizzard migration
- `vercel.json` no longer needs a `buildCommand` — `index.html` is already the right filename

---

## Key Design Decisions

- **Single HTML file**: Keeps deployment trivial (one file to copy/serve). React via CDN + Babel standalone means zero build step.
- **Python server (not Node)**: No npm install required for local dev. Pure stdlib.
- **Blizzard API over Raider.io**: Raider.io actively blocks server-side scraping; Blizzard API is official and documented.
- **Cookies for persistence**: No backend database needed. Searches saved client-side, 90-day expiry.
- **Greedy path algorithm**: Simple and fast for 8 dungeons. Not globally optimal but produces good results.
