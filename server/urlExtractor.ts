/**
 * Utility for flexible, fault-tolerant URL metadata and image extraction.
 * Supports:
 * - Direct image URLs (.jpg, .jpeg, .png, .webp, .gif, .avif, .svg)
 * - Open Graph (og:image, og:image:secure_url, og:image:url)
 * - Twitter/X Card (twitter:image, twitter:image:src)
 * - Schema.org JSON-LD (image, thumbnailUrl)
 * - Standard HTML preview tags (<link rel="image_src">, <meta itemprop="image">, <meta name="thumbnail">)
 * - Fallback prominent <img> tags
 * - Graceful fallback on bot-blocked/timeout/error URLs without failing post creation
 */

export interface ExtractedUrlInfo {
  imageUrl?: string;
  title?: string;
  description?: string;
  sourceName?: string;
  isDirectImage?: boolean;
}

const DIRECT_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|svg|avif|bmp|ico|tiff)(\?.*)?$/i;

/**
 * Normalizes and resolves a potential image URL relative to the source page URL.
 */
function resolveImageUrl(candidateUrl: string, baseUrl: string): string | undefined {
  if (!candidateUrl || typeof candidateUrl !== 'string') return undefined;
  const trimmed = candidateUrl.trim();
  if (!trimmed || trimmed.startsWith('data:') && trimmed.length < 200) {
    // Skip placeholder 1x1 data URIs
    return undefined;
  }

  // Handle protocol-relative URLs (//example.com/img.jpg)
  if (trimmed.startsWith('//')) {
    try {
      const base = new URL(baseUrl);
      return `${base.protocol}${trimmed}`;
    } catch (_) {
      return `https:${trimmed}`;
    }
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
      return resolved.href;
    }
  } catch (_) {}

  return undefined;
}

/**
 * Extracts metadata and image from any HTTP/HTTPS URL with zero domain restrictions and full fault-tolerance.
 */
export async function extractUrlMetadataAndImage(rawUrl: string): Promise<ExtractedUrlInfo> {
  const result: ExtractedUrlInfo = {};
  if (!rawUrl || typeof rawUrl !== 'string') return result;

  const trimmedUrl = rawUrl.trim();
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return result;
    }
  } catch (_) {
    return result;
  }

  result.sourceName = parsedUrl.hostname.replace(/^www\./i, '');

  // 1. Check if the URL itself is a direct image URL by file extension
  if (DIRECT_IMAGE_EXTENSIONS.test(parsedUrl.pathname)) {
    result.imageUrl = trimmedUrl;
    result.isDirectImage = true;
    result.title = parsedUrl.pathname.split('/').pop()?.split('?')[0] || result.sourceName;
    return result;
  }

  // 2. Fetch the page with a safe timeout and realistic user-agent headers
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const response = await fetch(trimmedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[UrlExtractor] HTTP ${response.status} returned for ${trimmedUrl}. Continuing post creation without image.`);
      return result;
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    // If the server returns an image Content-Type, treat the URL itself as the image
    if (contentType.startsWith('image/')) {
      result.imageUrl = trimmedUrl;
      result.isDirectImage = true;
      return result;
    }

    // Read only up to first 512KB for performance and security
    const html = await response.text();
    const sampleHtml = html.slice(0, 512 * 1024);

    // Extract Title
    const titleMatch =
      sampleHtml.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
      sampleHtml.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
      sampleHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      result.title = decodeHtmlEntities(titleMatch[1].trim());
    }

    // Extract Description
    const descMatch =
      sampleHtml.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
      sampleHtml.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
      sampleHtml.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
      result.description = decodeHtmlEntities(descMatch[1].trim());
    }

    // Extract Candidate Images in order of priority:
    const candidateImages: string[] = [];

    // 1) Open Graph image (og:image, og:image:secure_url, og:image:url)
    const ogMatches = [
      ...sampleHtml.matchAll(/<meta\s+[^>]*property=["'](?:og:image|og:image:secure_url|og:image:url)["'][^>]*content=["']([^"']+)["']/gi),
      ...sampleHtml.matchAll(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["'](?:og:image|og:image:secure_url|og:image:url)["']/gi),
    ];
    for (const match of ogMatches) {
      if (match[1]) candidateImages.push(match[1]);
    }

    // 2) Twitter / X card image (twitter:image, twitter:image:src)
    const twitterMatches = [
      ...sampleHtml.matchAll(/<meta\s+[^>]*name=["'](?:twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/gi),
      ...sampleHtml.matchAll(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["'](?:twitter:image|twitter:image:src)["']/gi),
      ...sampleHtml.matchAll(/<meta\s+[^>]*property=["'](?:twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["']/gi),
    ];
    for (const match of twitterMatches) {
      if (match[1]) candidateImages.push(match[1]);
    }

    // 3) Link rel="image_src" or link rel="apple-touch-icon"
    const linkMatches = [
      ...sampleHtml.matchAll(/<link\s+[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/gi),
      ...sampleHtml.matchAll(/<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']image_src["']/gi),
    ];
    for (const match of linkMatches) {
      if (match[1]) candidateImages.push(match[1]);
    }

    // 4) Meta itemprop="image" or meta name="thumbnail"
    const metaItemMatches = [
      ...sampleHtml.matchAll(/<meta\s+[^>]*itemprop=["']image["'][^>]*content=["']([^"']+)["']/gi),
      ...sampleHtml.matchAll(/<meta\s+[^>]*name=["']thumbnail["'][^>]*content=["']([^"']+)["']/gi),
    ];
    for (const match of metaItemMatches) {
      if (match[1]) candidateImages.push(match[1]);
    }

    // 5) Schema.org JSON-LD
    const jsonLdBlocks = sampleHtml.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const block of jsonLdBlocks) {
      try {
        const rawJson = block[1]?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          extractImagesFromJsonLd(parsed, candidateImages);
        }
      } catch (_) {}
    }

    // 6) Fallback: Check prominent <img> tags in HTML
    if (candidateImages.length === 0) {
      const imgMatches = sampleHtml.matchAll(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi);
      for (const imgMatch of imgMatches) {
        const src = imgMatch[1];
        if (
          src &&
          !src.includes('avatar') &&
          !src.includes('icon') &&
          !src.includes('logo') &&
          !src.includes('tracker') &&
          !src.includes('pixel') &&
          !src.includes('badge') &&
          DIRECT_IMAGE_EXTENSIONS.test(src)
        ) {
          candidateImages.push(src);
          if (candidateImages.length >= 3) break;
        }
      }
    }

    // Resolve the first valid image URL
    for (const candidate of candidateImages) {
      const resolved = resolveImageUrl(candidate, trimmedUrl);
      if (resolved) {
        result.imageUrl = resolved;
        break;
      }
    }
  } catch (err: any) {
    // Fault-tolerant: log and continue without image
    console.warn(`[UrlExtractor] Image extraction skipped for "${trimmedUrl}": ${err?.message || 'Network/Parsing issue'}`);
  }

  return result;
}

function extractImagesFromJsonLd(obj: any, out: string[]) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractImagesFromJsonLd(item, out);
    return;
  }

  if (typeof obj.image === 'string') {
    out.push(obj.image);
  } else if (Array.isArray(obj.image)) {
    for (const img of obj.image) {
      if (typeof img === 'string') out.push(img);
      else if (img && typeof img.url === 'string') out.push(img.url);
    }
  } else if (obj.image && typeof obj.image.url === 'string') {
    out.push(obj.image.url);
  }

  if (typeof obj.thumbnailUrl === 'string') {
    out.push(obj.thumbnailUrl);
  }

  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) extractImagesFromJsonLd(item, out);
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}
