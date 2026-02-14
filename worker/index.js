// CORS proxy worker for Syr's M+ Helper
// Forwards API requests to bypass CORS restrictions
addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url query param', { status: 400 });

    // Send proper headers to avoid being blocked
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://diab64.github.io/'
      }
    });

    const body = await upstream.arrayBuffer();
    const headers = new Headers(upstream.headers);
    // Ensure CORS is allowed for browser requests
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return new Response(body, { status: upstream.status, headers });
  } catch (err) {
    return new Response('Proxy error', { status: 502 });
  }
}
