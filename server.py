"""
Local development server for Syr's M+ Helper
Serves static files AND proxies Blizzard API requests with OAuth2

Usage:
  1. Create a .env file with your credentials (one-time):
       BLIZZARD_CLIENT_ID=your_client_id
       BLIZZARD_CLIENT_SECRET=your_client_secret
  2. Run: python server.py
  3. Open: http://localhost:3000
"""

import http.server
import urllib.request
import urllib.parse
import json
import os
import base64
import time

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


def load_env_file():
    """Load .env file from the project directory if it exists."""
    env_path = os.path.join(DIRECTORY, '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value and key not in os.environ:
                    os.environ[key] = value


load_env_file()

# Blizzard OAuth2 token cache
_token_cache = {'access_token': None, 'expires_at': 0}


def get_blizzard_token():
    """Get a valid Blizzard API access token, refreshing if needed."""
    client_id = os.environ.get('BLIZZARD_CLIENT_ID', '')
    client_secret = os.environ.get('BLIZZARD_CLIENT_SECRET', '')

    if not client_id or not client_secret:
        raise Exception('BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET environment variables are required')

    # Return cached token if still valid (with 60s buffer)
    if _token_cache['access_token'] and time.time() < _token_cache['expires_at'] - 60:
        return _token_cache['access_token']

    # Request new token
    credentials = base64.b64encode(f'{client_id}:{client_secret}'.encode()).decode()
    data = urllib.parse.urlencode({'grant_type': 'client_credentials'}).encode()

    req = urllib.request.Request('https://oauth.battle.net/token', data=data, method='POST')
    req.add_header('Authorization', f'Basic {credentials}')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')

    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read().decode('utf-8'))

    _token_cache['access_token'] = body['access_token']
    _token_cache['expires_at'] = time.time() + body.get('expires_in', 86399)
    print(f'  [auth] Obtained Blizzard access token (expires in {body.get("expires_in", "?")}s)')
    return _token_cache['access_token']


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path.startswith('/api/blizzard'):
            self.handle_blizzard_proxy()
            return

        # Legacy proxy endpoint (still works for non-Blizzard URLs)
        if self.path.startswith('/proxy?') or self.path.startswith('/proxy%3F'):
            self.handle_proxy()
            return

        if self.path == '/':
            self.path = '/syrs_mplus_helper.html'

        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def handle_blizzard_proxy(self):
        """Proxy requests to Blizzard API with OAuth2 Bearer token."""
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        target_url = params.get('url', [None])[0]

        if not target_url:
            self.send_error_json(400, 'Missing url parameter')
            return

        # Only allow requests to Blizzard API domains
        parsed_target = urllib.parse.urlparse(target_url)
        if not parsed_target.hostname or not parsed_target.hostname.endswith('.battle.net') and not parsed_target.hostname.endswith('.blizzard.com'):
            self.send_error_json(403, 'Only Blizzard API domains are allowed')
            return

        try:
            token = get_blizzard_token()

            req = urllib.request.Request(target_url)
            req.add_header('Authorization', f'Bearer {token}')
            req.add_header('Accept', 'application/json')

            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read().decode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))

        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            self.send_error_json(e.code, f'Blizzard API error: {e.code} - {body[:200]}')
        except Exception as e:
            self.send_error_json(502, str(e))

    def handle_proxy(self):
        """Legacy generic proxy for non-Blizzard URLs."""
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        target_url = params.get('url', [None])[0]

        if not target_url:
            self.send_error_json(400, 'Missing url parameter')
            return

        try:
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            req.add_header('Accept', 'application/json')

            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read().decode('utf-8')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))

        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            self.send_error_json(e.code, str(e))
        except Exception as e:
            self.send_error_json(502, str(e))

    def send_error_json(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': message}).encode('utf-8'))

    def log_message(self, format, *args):
        msg = str(args[0]) if args else ''
        if '/api/blizzard' in msg:
            print(f"  [blizz] {msg}")
        elif '/proxy?' in msg:
            print(f"  [proxy] {msg}")
        elif 'GET / ' in msg or '.html' in msg:
            print(f"  [page]  {msg}")


if __name__ == '__main__':
    has_creds = bool(os.environ.get('BLIZZARD_CLIENT_ID')) and bool(os.environ.get('BLIZZARD_CLIENT_SECRET'))

    print(f"\n  Syr's M+ Helper is running at:\n")
    print(f"  -> http://localhost:{PORT}\n")
    if has_creds:
        print(f"  Blizzard API credentials detected.")
    else:
        print(f"  WARNING: BLIZZARD_CLIENT_ID / BLIZZARD_CLIENT_SECRET not set!")
        print(f"  Character lookups will fail. Set them with:")
        print(f'    $env:BLIZZARD_CLIENT_ID = "your_id"')
        print(f'    $env:BLIZZARD_CLIENT_SECRET = "your_secret"')
    print(f"\n  Press Ctrl+C to stop.\n")

    server = http.server.HTTPServer(('', PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()
