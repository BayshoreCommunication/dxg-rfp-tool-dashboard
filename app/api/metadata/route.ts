import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the HTML with proper error handling
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return NextResponse.json({
        image: "",
        description: "",
        siteName: "",
        favicon: "",
        author: "",
        publishedTime: "",
        type: "",
      });
    }

    const html = await response.text();

    // Extract metadata from HTML
    const metadata = {
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
      favicon: extractFavicon(html, url),
      author: extractMetaTag(html, ['name="author"', 'property="article:author"']),
      publishedTime: extractMetaTag(html, ['property="article:published_time"']),
      type: extractMetaTag(html, ['property="og:type"']),
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Metadata fetch error:", error);
    // Return empty metadata instead of error to avoid breaking the UI
    return NextResponse.json({
      image: "",
      description: "",
      siteName: "",
      favicon: "",
      author: "",
      publishedTime: "",
      type: "",
    });
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
