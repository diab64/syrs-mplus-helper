"""
Local development server for Syr's M+ Helper
Serves static files AND proxies Raider.io API requests

Usage: python server.py
Then open: http://localhost:3000
"""

import http.server
import urllib.request
import urllib.parse
import json
import os

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Handle proxy requests
        if self.path.startswith('/proxy?') or self.path.startswith('/proxy%3F'):
            self.handle_proxy()
            return

        # Serve index page at root
        if self.path == '/':
            self.path = '/syrs_mplus_helper.html'

        # Serve static files
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_proxy(self):
        # Parse the target URL from query string
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        target_url = params.get('url', [None])[0]

        if not target_url:
            self.send_error_json(400, 'Missing url parameter')
            return

        try:
            # Make request to Raider.io
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent',
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/131.0.0.0 Safari/537.36')
            req.add_header('Accept', 'application/json')

            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read().decode('utf-8')

            # Send response with CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))

        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            if body.strip().startswith('<!DOCTYPE') or body.strip().startswith('<html'):
                self.send_error_json(403, 'API returned HTML instead of JSON')
            else:
                self.send_error_json(e.code, str(e))
        except Exception as e:
            self.send_error_json(502, str(e))

    def send_error_json(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))

    # Suppress request logging clutter
    def log_message(self, format, *args):
        if '/proxy?' in str(args[0]):
            print(f"  [proxy] {args[0]}")
        elif args[0].startswith('GET / ') or '.html' in str(args[0]):
            print(f"  [page]  {args[0]}")


if __name__ == '__main__':
    print(f"\n  Syr's M+ Helper is running at:\n")
    print(f"  -> http://localhost:{PORT}\n")
    print(f"  Press Ctrl+C to stop.\n")

    server = http.server.HTTPServer(('', PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()
