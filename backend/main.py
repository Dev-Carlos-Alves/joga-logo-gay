import http.server
import socketserver
import os

PORT = int(os.environ.get("PORT", 8080))

Handler = http.server.SimpleHTTPRequestHandler

# Allow the port to be reused (to avoid "Address already in use" errors during quick restarts)
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Servindo PWA na porta {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado.")
