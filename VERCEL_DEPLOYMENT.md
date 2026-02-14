# Deploy to Vercel

This guide explains how to deploy the M+ Helper to Vercel with a working backend proxy.

## Why Vercel?

Vercel provides:
- Free hosting for static sites
- Serverless functions (backend API)
- Automatic GitHub deployments
- Custom domains (optional)

The serverless function at `/api/proxy` acts as a backend to proxy Raider.io API requests, avoiding CORS issues.

## Deployment Steps

### 1. Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account (free)

### 2. Import Your Repository

1. Click "Add New..." → "Project"
2. Import your GitHub repository: `diab64/syrs-mplus-helper`
3. Vercel will auto-detect the configuration from `vercel.json`

### 3. Configure the Project

- **Framework Preset:** Other (leave as detected)
- **Root Directory:** `./` (default)
- **Build Command:** Leave empty or use the default
- **Output Directory:** Leave empty or use `.`
- **Install Command:** Leave empty (no dependencies to install)

### 4. Deploy

1. Click "Deploy"
2. Wait for the deployment to complete (usually ~1 minute)
3. You'll get a URL like: `https://your-project-name.vercel.app`

### 5. Test the Site

1. Open your Vercel URL
2. Try the realm autocomplete (should show ALL realms, not just fallbacks)
3. Look up a character (should show correct dungeon scores)

## Automatic Deployments

Vercel automatically deploys when you push to GitHub:
- Push to `main` branch → Deploys to production
- Push to other branches → Creates preview deployments

## Custom Domain (Optional)

To use your own domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

## Troubleshooting

**If realm autocomplete still shows only fallbacks:**
1. Check browser console (F12) for errors
2. Verify the `/api/proxy` endpoint is working:
   - Open: `https://your-project-name.vercel.app/api/proxy?url=https://raider.io/api/v1/realms?region=us`
   - Should return JSON with realm data

**If you see "proxy error":**
1. Check Vercel Functions logs in the dashboard
2. Verify the API function deployed correctly

## Cost

Vercel's free tier includes:
- Unlimited websites
- 100 GB bandwidth per month
- 100 GB-hours of serverless function execution
- This is more than enough for personal use

## Local Development

To test locally with the Vercel proxy:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Run local dev server:
   ```bash
   vercel dev
   ```

3. Open http://localhost:3000

This will simulate the Vercel environment locally.
