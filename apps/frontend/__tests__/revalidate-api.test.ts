import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/revalidate/route";

const revalidateTagMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
}));

describe("POST /api/revalidate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, REVALIDATION_SECRET: "super-secret-key-12345" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (
    body: unknown,
    headers: Record<string, string> = {},
    searchParams: string = ""
  ) => {
    const url = `http://localhost:3000/api/revalidate${searchParams ? `?${searchParams}` : ""}`;
    return new NextRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  };

  it("returns 500 if REVALIDATION_SECRET is not configured on server", async () => {
    delete process.env.REVALIDATION_SECRET;
    const req = createRequest(
      { tags: ["catalog"] },
      { "x-revalidate-secret": "some-secret" }
    );
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/i);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 401 if secret is missing", async () => {
    const req = createRequest({ tags: ["catalog"] });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Unauthorized/i);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("returns 401 if secret does not match", async () => {
    const req = createRequest(
      { tags: ["catalog"] },
      { "x-revalidate-secret": "wrong-secret-key" }
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("authenticates via x-revalidate-secret header", async () => {
    const req = createRequest(
      { tags: ["catalog"] },
      { "x-revalidate-secret": "super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revalidated).toBe(true);
    expect(data.tags).toEqual(["catalog"]);
    expect(revalidateTagMock).toHaveBeenCalledWith("catalog", "max");
  });

  it("authenticates via Authorization Bearer header", async () => {
    const req = createRequest(
      { tags: ["homepage"] },
      { authorization: "Bearer super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revalidated).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalledWith("homepage", "max");
  });

  it("authenticates via URL search param secret", async () => {
    const req = createRequest(
      { tags: ["categories"] },
      {},
      "secret=super-secret-key-12345"
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revalidated).toBe(true);
    expect(revalidateTagMock).toHaveBeenCalledWith("categories", "max");
  });

  it("rejects invalid request body with 400", async () => {
    const req = createRequest(
      { invalidProp: "test" },
      { "x-revalidate-secret": "super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("rejects non-whitelisted tags with 400", async () => {
    const req = createRequest(
      { tags: ["catalog", "evil-tag", "users-private-data"] },
      { "x-revalidate-secret": "super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/not permitted/i);
    expect(data.invalidTags).toEqual(["evil-tag", "users-private-data"]);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("accepts allowed exact and scoped slug prefix tags", async () => {
    const tags = [
      "catalog",
      "categories",
      "collections",
      "products",
      "homepage",
      "product-silk-kurta-123",
      "category-ethnic-wear",
      "collection-summer-2026",
    ];
    const req = createRequest(
      { tags },
      { "x-revalidate-secret": "super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.revalidated).toBe(true);
    expect(data.tags).toEqual(tags);
    expect(revalidateTagMock).toHaveBeenCalledTimes(tags.length);
    for (const tag of tags) {
      expect(revalidateTagMock).toHaveBeenCalledWith(tag, "max");
    }
  });

  it("deduplicates tags before calling revalidateTag", async () => {
    const req = createRequest(
      { tags: ["products", "products", "homepage"] },
      { "x-revalidate-secret": "super-secret-key-12345" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tags).toEqual(["products", "homepage"]);
    expect(revalidateTagMock).toHaveBeenCalledTimes(2);
  });
});
