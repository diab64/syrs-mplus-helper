// CORS proxy worker for Syr's M+ Helper
// Forwards API requests to bypass CORS restrictions
addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

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
    if (!target) return new Response('Missing url query param', { status: 400 });

    // Fetch with RaiderIO API key for authenticated access
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json'
    };

    // Add API key if available (set via environment variable)
    if (typeof RAIDERIO_API_KEY !== 'undefined') {
      headers['Authorization'] = `Bearer ${RAIDERIO_API_KEY}`;
    }

    const upstream = await fetch(target, { headers });
    const text = await upstream.text();

    // Check if we got HTML instead of JSON (blocked)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return new Response(JSON.stringify({error: 'API returned HTML instead of JSON - likely blocked'}), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const headers = new Headers(upstream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new Response(text, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({error: 'Proxy error', message: err.message}), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
