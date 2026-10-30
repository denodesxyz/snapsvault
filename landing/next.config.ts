import path from "node:path";
import type { NextConfig } from "next";

// The landing is a package inside the snapsvault monorepo. Pointing the
// root one level up matches what Next infers from the repo lockfile and keeps
// local runs working off the repo's node_modules without an install here.

// Inline scripts (Next's flight data, the pre-paint script, next-themes) need
// 'unsafe-inline' without nonces. The dev server also needs eval and its
// websocket for hot reload.
const dev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Short install URL for the SnapsOS CLI, always the current script on main.
  async redirects() {
    return [
      {
        source: "/snapsos.sh",
        destination: "https://raw.githubusercontent.com/denodesxyz/snapsvault/main/cli/snapsos.sh",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
