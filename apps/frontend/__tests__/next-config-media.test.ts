import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("Next.js Media Rewrite & Origin Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves to localhost:8000 in development default", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as any).NODE_ENV = "development";

    const nextConfig = (await import("../next.config")).default;
    const rewrites = await nextConfig.rewrites!();
    const mediaRewrite = (rewrites as any[]).find((r) => r.source === "/media/:path*");

    expect(mediaRewrite).toBeDefined();
    expect(mediaRewrite.destination).toBe("http://localhost:8000/media/:path*");
  });

  it("derives production media origin from NEXT_PUBLIC_API_URL removing /api/v1", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_API_URL = "https://api.closetbychili.com/api/v1";

    const nextConfig = (await import("../next.config")).default;
    const rewrites = await nextConfig.rewrites!();
    const mediaRewrite = (rewrites as any[]).find((r) => r.source === "/media/:path*");

    expect(mediaRewrite).toBeDefined();
    expect(mediaRewrite.destination).toBe("https://api.closetbychili.com/media/:path*");
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          protocol: "https",
          hostname: "api.closetbychili.com",
        }),
      ])
    );
  });

  it("handles trailing slashes on API URL in production", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_API_URL = "https://custom-backend.closetbychili.com/api/v1///";

    const nextConfig = (await import("../next.config")).default;
    const rewrites = await nextConfig.rewrites!();
    const mediaRewrite = (rewrites as any[]).find((r) => r.source === "/media/:path*");

    expect(mediaRewrite).toBeDefined();
    expect(mediaRewrite.destination).toBe("https://custom-backend.closetbychili.com/media/:path*");
  });

  it("falls back gracefully when NEXT_PUBLIC_API_URL is missing in production with a warning", async () => {
    (process.env as any).NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.BACKEND_API_URL;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const nextConfig = (await import("../next.config")).default;
    const rewrites = await nextConfig.rewrites!();
    const mediaRewrite = (rewrites as any[]).find((r) => r.source === "/media/:path*");

    expect(mediaRewrite).toBeDefined();
    expect(mediaRewrite.destination).toBe("http://localhost:8000/media/:path*");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_PUBLIC_API_URL is unset in production")
    );
  });
});
