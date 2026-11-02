import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "crypto";

// Allowed exact cache tags
const ALLOWED_EXACT_TAGS = new Set([
  "catalog",
  "categories",
  "collections",
  "products",
  "homepage",
]);

// Allowed tag prefix patterns (e.g., product-chikankari-kurti, category-ethnic-wear, collection-bestsellers)
const TAG_PREFIX_PATTERN = /^(product|category|collection)-[a-zA-Z0-9_-]+$/;

function isTagAllowed(tag: string): boolean {
  if (ALLOWED_EXACT_TAGS.has(tag)) {
    return true;
  }
  return TAG_PREFIX_PATTERN.test(tag);
}

function verifySecret(req: NextRequest): boolean {
  const serverSecret = process.env.REVALIDATION_SECRET;
  if (!serverSecret) {
    return false;
  }

  const headerSecret = req.headers.get("x-revalidate-secret");
  const authHeader = req.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const querySecret = req.nextUrl.searchParams.get("secret");

  const providedSecret = headerSecret || bearerSecret || querySecret;
  if (!providedSecret) {
    return false;
  }

  const serverBuf = Buffer.from(serverSecret, "utf-8");
  const clientBuf = Buffer.from(providedSecret, "utf-8");

  if (serverBuf.length !== clientBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(serverBuf, clientBuf);
}

export async function POST(req: NextRequest) {
  if (!process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { error: "Revalidation secret is not configured on the server." },
      { status: 500 }
    );
  }

  if (!verifySecret(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing revalidation secret." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const rawTags: unknown =
    body && typeof body === "object"
      ? (body as Record<string, unknown>).tags ??
        ((body as Record<string, unknown>).tag ? [(body as Record<string, unknown>).tag] : [])
      : [];

  if (!Array.isArray(rawTags) || rawTags.length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'tags' parameter. Expected an array of tags." },
      { status: 400 }
    );
  }

  const invalidTags: string[] = [];
  const validTags: string[] = [];

  for (const item of rawTags) {
    if (typeof item !== "string" || !item.trim()) {
      invalidTags.push(String(item));
      continue;
    }
    const cleanTag = item.trim();
    if (isTagAllowed(cleanTag)) {
      validTags.push(cleanTag);
    } else {
      invalidTags.push(cleanTag);
    }
  }

  if (invalidTags.length > 0) {
    return NextResponse.json(
      {
        error: "One or more tags are not permitted.",
        invalidTags,
      },
      { status: 400 }
    );
  }

  // De-duplicate tags
  const uniqueTags = Array.from(new Set(validTags));

  for (const tag of uniqueTags) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({
    revalidated: true,
    tags: uniqueTags,
    timestamp: Date.now(),
  });
}
