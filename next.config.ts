import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://*.paypal.com https://*.paypalobjects.com https://*.venmo.com",
  "style-src 'self' 'unsafe-inline' https://*.paypal.com https://*.paypalobjects.com https://*.venmo.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://*.paypalobjects.com",
  "connect-src 'self' https://api-m.sandbox.paypal.com https://*.paypal.com https://*.paypalobjects.com https://*.venmo.com",
  "child-src 'self' https://*.paypal.com https://*.paypalobjects.com https://*.venmo.com",
  "frame-src 'self' https://*.paypal.com https://*.paypalobjects.com https://*.venmo.com",
  "form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
