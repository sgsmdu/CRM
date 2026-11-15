"""
Tiny CORS proxy for the local PaddleOCR server (standard library only).

  Browser (https://crm.sgsmdu.in)  ->  this proxy :8080  ->  PaddleOCR :8090

Run it with the SAME python that has paddleocr installed (no pip install needed):
  & "$env:USERPROFILE\\paddleocr-env\\Scripts\\python.exe" cors_proxy.py
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.request
import urllib.error

LISTEN_PORT = 8080                      # CRM talks to http://localhost:8080/ocr (unchanged)
TARGET = "http://127.0.0.1:8090"        # real PaddleOCR server
ALLOWED_ORIGINS = {
    "https://crm.sgsmdu.in",
    "https://www.crm.sgsmdu.in",
    "http://localhost:3000",
}


class Proxy(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header(
                "Access-Control-Allow-Headers",
                self.headers.get("Access-Control-Request-Headers", "Content-Type, Authorization"),
            )
            # Chrome "Private/Local Network Access" preflight
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def _forward(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(TARGET + self.path, data=body, method=self.command)
        for h in ("Content-Type", "Authorization"):
            if self.headers.get(h):
                req.add_header(h, self.headers[h])
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                status, data, ctype = r.status, r.read(), r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            status, data, ctype = e.code, e.read(), e.headers.get("Content-Type", "text/plain")
        except Exception as e:  # PaddleOCR not running etc.
            status, data, ctype = 502, f"PaddleOCR not reachable: {e}".encode(), "text/plain"
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    do_POST = _forward
    do_GET = _forward

    def log_message(self, fmt, *args):
        print("[proxy]", fmt % args)


if __name__ == "__main__":
    print(f"CORS proxy on http://127.0.0.1:{LISTEN_PORT}  ->  {TARGET}")
    ThreadingHTTPServer(("127.0.0.1", LISTEN_PORT), Proxy).serve_forever()
