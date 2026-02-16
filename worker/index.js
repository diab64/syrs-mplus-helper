// CORS proxy worker for Syr's M+ Helper
// Proxies Blizzard API requests with OAuth2 authentication
// Secrets required: BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET

let tokenCache = { access_token: null, expires_at: 0 };

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function getBlizzardToken() {
  // Return cached token if still valid (60s buffer)
  if (tokenCache.access_token && Date.now() / 1000 < tokenCache.expires_at - 60) {
    return tokenCache.access_token;
  }

  const credentials = btoa(`${BLIZZARD_CLIENT_ID}:${BLIZZARD_CLIENT_SECRET}`);
  const resp = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    throw new Error(`Token request failed: ${resp.status}`);
  }

  const data = await resp.json();
  tokenCache.access_token = data.access_token;
  tokenCache.expires_at = Date.now() / 1000 + (data.expires_in || 86399);
  return data.access_token;
}

async function handle(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url query param' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Only allow Blizzard API domains
    const targetUrl = new URL(target);
    if (!targetUrl.hostname.endsWith('.battle.net') && !targetUrl.hostname.endsWith('.blizzard.com')) {
      return new Response(JSON.stringify({ error: 'Only Blizzard API domains are allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Check credentials are configured
    const hasCredentials = typeof BLIZZARD_CLIENT_ID !== 'undefined' && BLIZZARD_CLIENT_ID
                        && typeof BLIZZARD_CLIENT_SECRET !== 'undefined' && BLIZZARD_CLIENT_SECRET;
    if (!hasCredentials) {
      return new Response(JSON.stringify({ error: 'Blizzard API credentials not configured in worker secrets' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const token = await getBlizzardToken();

    const upstream = await fetch(target, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      }
    });

    const text = await upstream.text();
    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(text, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', message: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
