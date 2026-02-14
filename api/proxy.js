// Vercel serverless function to proxy Raider.io API requests
// This avoids CORS issues and provides a backend for the static site

export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Get target URL from query parameter
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    // Make request to Raider.io with proper headers
    const raiderResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    // Get response text
    const text = await raiderResponse.text();

    // Check if we got HTML instead of JSON (blocked)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      return response.status(403).json({
        error: 'API returned HTML instead of JSON - likely blocked'
      });
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return response.status(500).json({
        error: 'Failed to parse API response as JSON'
      });
    }

    // Return the data
    return response.status(raiderResponse.status).json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return response.status(502).json({
      error: 'Proxy error',
      message: error.message
    });
  }
}
