# Local Development — Serve the App Locally

To allow the Raider.io API fetches to succeed (same behavior as when hosted online), serve the files over HTTP from a local dev server instead of opening the HTML file via `file://`.

Options:

- Quick (Python 3 built-in server)

  Windows (PowerShell/CMD):

```bash
py -3 -m http.server 8000
```

  macOS / Linux:

```bash
python3 -m http.server 8000
```

  Then open: http://localhost:8000/syrs_mplus_helper.html

- Node (temporary, no install required)

```bash
# using npx (one-off)
npx http-server -p 8000
# or
npx serve -l 8000
```

Then open: http://localhost:8000/syrs_mplus_helper.html

Notes:
- Serving over HTTP is usually sufficient for calling Raider.io's HTTPS API. If you need a secure context (https) for other browser APIs, consider using `mkcert` to create a local certificate and serve via a small HTTPS server.
- If you still see network errors after serving locally, check browser console for CORS or network blocks. Serving the file over `http(s)` typically resolves the "request blocked" behaviour seen when opening via `file://`.

Live Server (VS Code):

If you use the Live Server extension and open the file via "Open with Live Server" (e.g. http://127.0.0.1:5500/syrs_mplus_helper.html), the app should behave the same as when hosted online. The app also includes a fallback that retries requests via a public CORS proxy if the browser blocks direct requests. If you still see errors:

- Check the browser console (F12) for CORS/network errors.
- Ensure Live Server is running and serving the file over `http://` (not `file://`).
- If requests are still blocked, try disabling other extensions that might modify requests, or serve the folder using the Python or Node commands above.

File: syrs_mplus_helper.html

If you want, I can add a small `serve.ps1`/`serve.sh` helper script to the repo. Reply if you'd like that.

---

Local CORS proxy (recommended if Raider.io blocks direct requests):

You can run a small local proxy that forwards requests to Raider.io and adds CORS headers. This is useful when the API does not set Access-Control-Allow-Origin for browser requests.

1. Install dependencies (requires Node.js):

```bash
npm install express node-fetch@2 cors
```

2. Run the proxy server (from the project root):

```bash
node proxy-server.js
```

The proxy listens on `http://127.0.0.1:3000`. The app will try this proxy automatically as a first fallback if direct requests are blocked.

Security note: This proxy is intended for local development only. Do not expose it to the public internet.

---

GitHub Pages and Cloudflare Worker (recommended workflow)

1) GitHub Pages

 - I added a GitHub Action file at `.github/workflows/deploy-pages.yml` that builds a small `site/` folder (copies `syrs_mplus_helper.html` to `site/index.html`) and publishes `site/` to the `gh-pages` branch. When the workflow runs, GitHub Pages can be configured to serve the site from the `gh-pages` branch (or from the `docs/` folder if you prefer).

Usage:
 - Push your repo to GitHub (create a `main` branch if you haven't).
 - The action runs on pushes to `main` and will publish to a `gh-pages` branch. In your repository settings -> Pages, set the source to `gh-pages` branch / root.

2) Cloudflare Worker (for a reliable proxy)

 - I added a Cloudflare Worker template at `worker/index.js` and a `wrangler.toml` template. There's also a GitHub Actions workflow at `.github/workflows/deploy-worker.yml` which can publish the worker using `wrangler`.

To allow automated deploys from GitHub Actions you'll need to add these repository secrets (Repository Settings → Secrets → Actions):

 - `CF_API_TOKEN` — an API Token created in your Cloudflare account with the following recommended scoped permissions:
   - Account > Workers Scripts: Edit
   - (optional) Account > Workers KV Storage: Read/Write (only if you use KV)
 - `CF_ACCOUNT_ID` — your Cloudflare Account ID (found in the dashboard)
 - `CF_WORKER_NAME` — the name you want for the worker (e.g. `syrs-mplus-helper-proxy`)

How to create the API Token (Cloudflare):
 - Log in to the Cloudflare dashboard.
 - Go to "My Profile" → "API Tokens" → "Create Token".
 - Choose "Custom token" and add the `Account > Workers Scripts: Edit` permission (set it to `Edit`).
 - (Optional) limit token to specific account resources.
 - Create the token and copy it once — Cloudflare only shows it at creation.

After you add the secrets, you can run the "Deploy Cloudflare Worker" workflow manually from the Actions tab or push changes to `worker/` to trigger it.

Security note: only add scoped API tokens and store them as GitHub secrets. Do not paste tokens in chat or commit them to the repo.

If you'd like, I can:
 - Create a `package.json` with an `npm run proxy` script to run `proxy-server.js` locally, and an `npm run pages` script to preview the built `site/` folder.
 - Create a small GitHub Pages guide or automatically wire Pages source to `gh-pages` branch via a management script (you'll still need to enable Pages in repo settings).


