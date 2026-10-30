import type { NextConfig } from "next";

const feedsOrigin = process.env.FEEDS_ORIGIN;

if (feedsOrigin) {
  const local = process.env.NODE_ENV !== 'production' && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(feedsOrigin);
  if (!local && !/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(feedsOrigin)) {
    throw new Error('FEEDS_ORIGIN must be an https origin without credentials, path, query, fragment or trailing slash');
  }
}

// Inline scripts (Next's flight data, the pre-paint theme script) need 'unsafe-inline' without
// nonces. Contributor logos load from any https host. The dev server also needs eval and its
// websocket for hot reload.
const dev = process.env.NODE_ENV === 'development';
const csp = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "font-src 'self'",
  `connect-src 'self'${dev ? ' ws:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const publicApiPaths = [
  '/api/snapshots',
  '/api/snapshots/historical',
  '/api/networks',
  '/api/contributors',
  '/api/snapshot-configurations',
  '/api/cli',
  '/api/cli/latest',
  '/api/cli/snapshots',
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: 's3.amazonaws.com', pathname: '/keybase_processed_uploads/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      ...publicApiPaths.map((source) => ({
        source,
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      })),
    ];
  },
  async rewrites() {
    if (!feedsOrigin) return [];
    return [
      {
        source: '/feeds/:file([a-z0-9-]+\\.json)',
        destination: `${feedsOrigin}/feeds/:file`,
      },
    ];
  },
};

export default nextConfig;
