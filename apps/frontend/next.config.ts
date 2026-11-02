import type { NextConfig } from "next";

/**
 * Resolves the backend media destination origin from environment variables.
 * In development: defaults to http://localhost:8000/media/:path*
 * In production: derives the media origin from NEXT_PUBLIC_API_URL with /api/v1 stripped.
 */
function resolveMediaDestination(): string {
  const isProd = process.env.NODE_ENV === "production";
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;

  if (rawApiUrl && rawApiUrl !== "undefined") {
    try {
      const parsed = new URL(rawApiUrl);
      // Remove trailing slashes, then remove trailing /api/v1, /api/v1, /api
      const normalizedPath = parsed.pathname.replace(/\/+$/, "");
      const cleanPath = normalizedPath.replace(/\/api(\/v\d+)?$/, "");
      const origin = `${parsed.protocol}//${parsed.host}${cleanPath}`.replace(/\/+$/, "");
      return `${origin}/media/:path*`;
    } catch {
      if (isProd) {
        console.warn(
          `[next.config.ts] Malformed NEXT_PUBLIC_API_URL: "${rawApiUrl}". Falling back to local media route.`
        );
      }
    }
  }

  if (isProd) {
    console.warn(
      "[next.config.ts] Warning: NEXT_PUBLIC_API_URL is unset in production. Falling back to local media route."
    );
  }

  return "http://localhost:8000/media/:path*";
}

function getRemoteHostPatterns() {
  const patterns: Array<{ protocol: "http" | "https"; hostname: string }> = [
    {
      protocol: "https",
      hostname: "lh3.googleusercontent.com",
    },
    {
      protocol: "https",
      hostname: "res.cloudinary.com",
    },
    {
      protocol: "http",
      hostname: "localhost",
    },
    {
      protocol: "http",
      hostname: "127.0.0.1",
    },
  ];

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_API_URL;
  if (rawApiUrl && rawApiUrl !== "undefined") {
    try {
      const parsed = new URL(rawApiUrl);
      if (
        parsed.hostname &&
        !patterns.some((p) => p.hostname === parsed.hostname)
      ) {
        patterns.push({
          protocol: parsed.protocol.replace(":", "") as "http" | "https",
          hostname: parsed.hostname,
        });
      }
    } catch {
      // Ignored: Malformed URL handled above
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: getRemoteHostPatterns(),
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: resolveMediaDestination(),
      },
    ];
  },
};

export default nextConfig;

