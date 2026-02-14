// CORS proxy worker for Syr's M+ Helper
addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing url query param', { status: 400 });
    const upstream = await fetch(target, { headers: { 'User-Agent': 'syrs-mplus-helper-proxy' } });
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
