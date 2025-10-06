# Cache headers for static assets
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Security headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)

# PWA manifest
/manifest.json
  Cache-Control: public, max-age=0, must-revalidate
  Content-Type: application/manifest+json

# Service worker
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
  Content-Type: application/javascript