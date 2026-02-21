# Vercel Deployment Guide

## Overview

Vercel hosts the static frontend and provides a serverless `/api/proxy` function that handles Blizzard OAuth2 server-side (credentials never exposed to the browser).

## Prerequisites

- Blizzard developer account with an app registered at https://develop.battle.net/
- GitHub repo connected to Vercel
- Vercel account (free tier is sufficient)

## One-time Setup

### 1. Vercel Environment Variables

In Vercel dashboard → Project → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `BLIZZARD_CLIENT_ID` | Your Blizzard app client ID |
| `BLIZZARD_CLIENT_SECRET` | Your Blizzard app client secret |

Set scope to **Production** (and Preview/Development if you want).

### 2. Import Repository

1. vercel.com → Add New → Project → Import your GitHub repo
2. Framework: **Other**
3. Build Command: *(leave empty — `index.html` is already the filename)*
4. Output Directory: `.`
5. Deploy

Vercel auto-deploys on every push to `main`.

## How It Works

- Frontend: `index.html` (served directly, no build step needed)
- API proxy: `api/proxy.js` — receives `?url=https://...api.blizzard.com/...`, fetches a Blizzard OAuth2 token using env vars, proxies the request, returns JSON
- The frontend detects it's on Vercel (not localhost) and routes all Blizzard API calls through `/api/proxy`

## Verifying Deployment

Test the proxy directly:
```
https://your-project.vercel.app/api/proxy?url=https://us.api.blizzard.com/data/wow/realm/index?namespace=dynamic-us%26locale=en_US
```
Should return JSON with realm data. If it returns an error about credentials, check env vars.

## Local Development (without Vercel CLI)

Run the Python server (no npm required):
```
python server.py
```
Requires `.env` file with:
```
BLIZZARD_CLIENT_ID=your_id
BLIZZARD_CLIENT_SECRET=your_secret
```
