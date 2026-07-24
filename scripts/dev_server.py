import http.server
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8843
directory = sys.argv[2] if len(sys.argv) > 2 else "."


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


handler = lambda *args, **kwargs: NoCacheHandler(*args, directory=directory, **kwargs)
http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
