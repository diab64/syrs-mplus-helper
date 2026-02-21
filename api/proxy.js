// Vercel serverless function: proxy Blizzard API requests with OAuth2
// Required env vars (set in Vercel dashboard → Settings → Environment Variables):
//   BLIZZARD_CLIENT_ID
//   BLIZZARD_CLIENT_SECRET

// Note: token is cached per-instance (warm Vercel invocations reuse it)
let tokenCache = { access_token: null, expires_at: 0 };

async function getBlizzardToken() {
  if (tokenCache.access_token && Date.now() / 1000 < tokenCache.expires_at - 60) {
    return tokenCache.access_token;
  }

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET must be set in Vercel environment variables');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) throw new Error(`Blizzard token request failed: ${resp.status}`);

  const data = await resp.json();
  tokenCache.access_token = data.access_token;
  tokenCache.expires_at = Date.now() / 1000 + (data.expires_in || 86399);
  return data.access_token;
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(200).end();

  const { url } = request.query;
  if (!url) return response.status(400).json({ error: 'Missing url parameter' });

  // Only allow Blizzard API domains
  let parsed;
  try { parsed = new URL(url); } catch { return response.status(400).json({ error: 'Invalid URL' }); }
  if (!parsed.hostname.endsWith('.battle.net') && !parsed.hostname.endsWith('.blizzard.com')) {
    return response.status(403).json({ error: 'Only Blizzard API domains are allowed' });
  }

  try {
    const token = await getBlizzardToken();
    const upstream = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const data = await upstream.json();
    return response.status(upstream.status).json(data);
  } catch (error) {
    return response.status(502).json({ error: 'Proxy error', message: error.message });
  }
}
