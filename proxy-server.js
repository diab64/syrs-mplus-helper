// Simple local proxy to bypass CORS for development.
// Usage:
// 1. npm install express node-fetch@2 cors
// 2. node proxy-server.js
// The server will run on http://127.0.0.1:3000 and expose /proxy?url=...

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('Missing url query parameter');
  try {
    const upstream = await fetch(url);
    const buffer = await upstream.buffer();
    // copy most headers, but avoid hop-by-hop headers
    upstream.headers.forEach((v, k) => {
      if (['transfer-encoding', 'connection'].includes(k.toLowerCase())) return;
      res.set(k, v);
    });
    res.set('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(buffer);
  } catch (err) {
    res.status(502).send('Proxy fetch failed');
  }
});

const PORT = 3000;
app.listen(PORT, '127.0.0.1', () => console.log(`Local proxy running: http://127.0.0.1:${PORT}/proxy?url=...`));
