import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns/promises";
import { auth } from "@/auth";

export const runtime = "nodejs";

/* This endpoint server-side fetches a caller-supplied URL, which makes it an
   SSRF primitive unless it is constrained. It is session-gated (also enforced
   in proxy.ts, which no longer lists it as a public prefix), restricted to
   https, and refused for any hostname that resolves to a private, loopback, or
   link-local address — checked after resolution and again on every redirect
   hop, since a public hostname can redirect or re-resolve to an internal one. */

const EMPTY = {
  image: "",
  description: "",
  siteName: "",
  favicon: "",
  author: "",
  publishedTime: "",
  type: "",
};

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5_000;
const MAX_REDIRECTS = 3;

const isBlockedIpv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 || // "this network"
    a === 10 || // RFC1918
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local, incl. cloud metadata 169.254.169.254
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 168) || // RFC1918
    (a === 100 && b >= 64 && b <= 127) || // RFC6598 carrier-grade NAT
    a >= 224 // multicast + reserved
  );
};

const isBlockedIpv6 = (ip: string): boolean => {
  const value = ip.toLowerCase().split("%")[0];
  if (value === "::" || value === "::1") return true; // unspecified, loopback
  if (value.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(value)) return true; // unique local
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
};

/* Resolves every A/AAAA record and rejects if ANY is internal, so a hostname
   with mixed public/private records cannot be used to slip past the check. */
const hostnameIsSafe = async (hostname: string): Promise<boolean> => {
  try {
    const results = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!results.length) return false;
    return results.every(({ address, family }) =>
      family === 6 ? !isBlockedIpv6(address) : !isBlockedIpv4(address),
    );
  } catch {
    return false;
  }
};

const parseSafeUrl = async (raw: unknown): Promise<URL | null> => {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  return (await hostnameIsSafe(parsed.hostname)) ? parsed : null;
};

/* Manual redirect handling: "follow" would let a safe origin bounce us to an
   internal one without any further validation. */
const safeFetch = async (start: URL, signal: AbortSignal): Promise<Response | null> => {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(current, {
      headers: {
        "User-Agent": "RFPilot-LinkPreview/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal,
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    const next = await parseSafeUrl(new URL(location, current).toString());
    if (!next) return null;
    current = next;
  }
  return null;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = (await req.json()) as { url?: unknown };
    const target = await parseSafeUrl(body?.url);
    if (!target) {
      return NextResponse.json(
        { error: "A public https URL is required." },
        { status: 400 },
      );
    }

    const response = await safeFetch(target, controller.signal);
    if (!response || !response.ok) return NextResponse.json(EMPTY);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("html")) return NextResponse.json(EMPTY);

    // Cap the body: a hostile or oversized page must not be read into memory
    // whole just to scrape a handful of meta tags.
    const html = (await response.text()).slice(0, MAX_BYTES);

    return NextResponse.json({
      image: extractMetaTag(html, [
        'property="og:image"',
        'name="twitter:image"',
        'property="twitter:image"',
      ]),
      description: extractMetaTag(html, [
        'property="og:description"',
        'name="description"',
        'name="twitter:description"',
      ]),
      siteName: extractMetaTag(html, [
        'property="og:site_name"',
        'name="application-name"',
      ]),
      favicon: extractFavicon(html, target.toString()),
      author: extractMetaTag(html, ['name="author"', 'property="article:author"']),
      publishedTime: extractMetaTag(html, ['property="article:published_time"']),
      type: extractMetaTag(html, ['property="og:type"']),
    });
  } catch {
    // Deliberately opaque: fetch failures must not become a probe oracle for
    // internal hosts. The UI treats empty metadata as "no preview".
    return NextResponse.json(EMPTY);
  } finally {
    clearTimeout(timer);
  }
}

function extractMetaTag(html: string, selectors: string[]): string {
  for (const selector of selectors) {
    const regex = new RegExp(`<meta\\s+${selector}\\s+content=["']([^"']+)["']`, "i");
    const match = html.match(regex);
    if (match) return match[1];

    // Try reversed order (content before name/property)
    const reverseRegex = new RegExp(
      `<meta\\s+content=["']([^"']+)["']\\s+${selector}`,
      "i"
    );
    const reverseMatch = html.match(reverseRegex);
    if (reverseMatch) return reverseMatch[1];
  }
  return "";
}

function extractFavicon(html: string, baseUrl: string): string {
  const iconRegex = /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i;
  const match = html.match(iconRegex);

  if (match) {
    const href = match[1];
    if (href.startsWith("http")) return href;
    if (href.startsWith("//")) return "https:" + href;
    if (href.startsWith("/")) {
      try {
        const url = new URL(baseUrl);
        return url.origin + href;
      } catch {
        return "";
      }
    }
    return href;
  }

  // Default to /favicon.ico
  try {
    const url = new URL(baseUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return "";
  }
}
