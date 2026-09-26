import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origin of the API (NEXT_PUBLIC_API_URL is inlined at build time, same as in lib/api/client.ts). */
function apiOrigin(): string {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  try {
    return new URL(url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

// Local print bridge (print-bridge/, always on the till itself)
const PRINT_BRIDGE = ["http://127.0.0.1:17777", "http://localhost:17777"];

/**
 * Content-Security-Policy.
 *
 * script-src uses 'unsafe-inline' because Next.js injects inline bootstrap
 * scripts (RSC payload, hydration) and nonces would force every page to be
 * rendered dynamically through a proxy. The rest of the policy still blocks
 * third-party scripts, plugins, framing, <base> hijacking and form posts to
 * other origins, and limits where data can be sent (connect-src). Development
 * additionally needs 'unsafe-eval' (React debugging) and WebSockets (HMR).
 *
 * img-src allows any https: origin because product images and the store logo
 * may be served from an S3/CDN domain (S3_PUBLIC_URL on the API), not only
 * from the API itself.
 *
 * No upgrade-insecure-requests: the print bridge is plain http on 127.0.0.1.
 */
function contentSecurityPolicy(): string {
  const api = apiOrigin();
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", api],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", api, ...PRINT_BRIDGE, ...(isDev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${[...new Set(values)].join(" ")}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image
  output: "standalone",

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Production builds only (browsers ignore it over plain http, e.g. local Docker)
          ...(isDev
            ? []
            : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
      {
        // Always fetch the latest service worker
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
