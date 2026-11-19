import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_REDIRECTS = 5;
const MAX_HTML_BYTES = 512 * 1024;

interface RedirectHop {
  url: string;
  status: number;
  location: string | null;
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  if (/^10\./.test(lower) || /^192\.168\./.test(lower) || /^169\.254\./.test(lower)) {
    return true;
  }
  const match172 = /^172\.(\d+)\./.exec(lower);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) {
      return true;
    }
  }
  return false;
}

function parseFrameAncestors(csp: string | null): string | null {
  if (!csp) return null;
  const directives = csp.split(';').map((d) => d.trim());
  const fa = directives.find((d) => d.toLowerCase().startsWith('frame-ancestors'));
  return fa ?? null;
}

function evaluateEmbeddability(
  headers: Headers,
  redirects: RedirectHop[],
  finalUrl: string
): { embeddable: boolean; reason: string | null; isVercelSso: boolean } {
  const isVercelSso =
    finalUrl.includes('vercel.com/sso-api') ||
    redirects.some((hop) => hop.location?.includes('vercel.com/sso-api'));

  const xfo = headers.get('x-frame-options')?.trim() ?? null;
  const csp = headers.get('content-security-policy');
  const frameAncestors = parseFrameAncestors(csp);

  if (isVercelSso) {
    return {
      embeddable: false,
      reason: 'Vercel Deployment Protection redirected this preview to vercel.com/sso-api, which sets X-Frame-Options: DENY.',
      isVercelSso: true,
    };
  }

  if (xfo) {
    const upper = xfo.toUpperCase();
    if (upper === 'DENY' || upper === 'SAMEORIGIN') {
      return {
        embeddable: false,
        reason: `Response header X-Frame-Options: ${xfo} prevents third-party iframe embedding.`,
        isVercelSso: false,
      };
    }
  }

  if (frameAncestors) {
    const lower = frameAncestors.toLowerCase();
    if (lower.includes("'none'") || (lower.includes("'self'") && !lower.includes('*'))) {
      return {
        embeddable: false,
        reason: `Content-Security-Policy (${frameAncestors}) restricts iframe embedding.`,
        isVercelSso: false,
      };
    }
  }

  return { embeddable: true, reason: null, isVercelSso: false };
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractHtmlDetails(html: string) {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

  const metaTags: Array<{ key: string; value: string }> = [];
  const metaRegex = /<meta\s+([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1];
    const nameMatch = /(?:name|property)=["']([^"']+)["']/i.exec(attrs);
    const contentMatch = /content=["']([^"']*)["']/i.exec(attrs);
    if (nameMatch && contentMatch) {
      metaTags.push({
        key: nameMatch[1],
        value: decodeHtmlEntities(contentMatch[1]),
      });
    }
  }

  const assets: Array<{ type: 'script' | 'stylesheet' | 'font' | 'preconnect'; href: string; crossorigin?: boolean }> = [];
  const linkRegex = /<link\s+([^>]*?)\/?>/gi;
  while ((m = linkRegex.exec(html)) !== null) {
    const attrs = m[1];
    const relMatch = /rel=["']([^"']+)["']/i.exec(attrs);
    const hrefMatch = /href=["']([^"']+)["']/i.exec(attrs);
    if (relMatch && hrefMatch) {
      const rel = relMatch[1].toLowerCase();
      const href = decodeHtmlEntities(hrefMatch[1]);
      const crossorigin = /crossorigin/i.test(attrs);
      if (rel === 'stylesheet') {
        const type = href.includes('fonts.googleapis.com') ? 'font' : 'stylesheet';
        assets.push({ type, href, crossorigin });
      } else if (rel === 'preconnect') {
        assets.push({ type: 'preconnect', href, crossorigin });
      }
    }
  }

  const scriptRegex = /<script\s+([^>]*?)>/gi;
  while ((m = scriptRegex.exec(html)) !== null) {
    const attrs = m[1];
    const srcMatch = /src=["']([^"']+)["']/i.exec(attrs);
    if (srcMatch) {
      assets.push({
        type: 'script',
        href: decodeHtmlEntities(srcMatch[1]),
        crossorigin: /crossorigin/i.test(attrs),
      });
    }
  }

  return { title, metaTags, assets };
}

function formatHtmlForDiff(rawHtml: string): string {
  // Format compact single-line HTML builds cleanly across lines for readable diffing
  if (!rawHtml) return '';
  const lineCount = rawHtml.split('\n').length;
  if (lineCount > 10) {
    return rawHtml;
  }
  return rawHtml
    .replace(/>\s*</g, '>\n<')
    .trim();
}

async function inspectUrl(targetUrl: string, bypassSecret?: string) {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new Error('Invalid URL format. Include https:// or http://.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are supported.');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('Local or private network addresses cannot be inspected.');
  }

  const start = performance.now();
  let currentUrl = parsed.toString();
  const redirects: RedirectHop[] = [];
  let response: Response | null = null;
  let initialStatus = 0;

  const requestHeaders: Record<string, string> = {
    'User-Agent': 'AppCompare-Inspector/1.0',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };
  if (bypassSecret && bypassSecret.trim()) {
    requestHeaders['x-vercel-protection-bypass'] = bypassSecret.trim();
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(currentUrl, {
      method: 'GET',
      headers: requestHeaders,
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });

    if (hop === 0) {
      initialStatus = response.status;
    }

    const location = response.headers.get('location');
    if (
      response.status >= 300 &&
      response.status < 400 &&
      location &&
      hop < MAX_REDIRECTS
    ) {
      const nextUrl = new URL(location, currentUrl).toString();
      redirects.push({
        url: currentUrl,
        status: response.status,
        location: nextUrl,
      });
      // Drain redirect body so socket closes cleanly
      try {
        await response.body?.cancel();
      } catch {
        // Ignore cancellation error
      }
      currentUrl = nextUrl;
      const nextParsed = new URL(currentUrl);
      if (isBlockedHostname(nextParsed.hostname)) {
        throw new Error('Redirect pointed to a restricted local host.');
      }
      continue;
    }

    break;
  }

  const latencyMs = Math.round(performance.now() - start);
  if (!response) {
    throw new Error('No response received from target host.');
  }

  const interestingHeaderKeys = [
    'content-type',
    'server',
    'cache-control',
    'etag',
    'last-modified',
    'content-length',
    'access-control-allow-origin',
    'x-frame-options',
    'content-security-policy',
    'x-vercel-cache',
    'x-vercel-id',
    'strict-transport-security',
  ];

  const headersObj: Record<string, string> = {};
  for (const key of interestingHeaderKeys) {
    const val = response.headers.get(key);
    if (val !== null) {
      headersObj[key] = val;
    }
  }

  const embedEval = evaluateEmbeddability(response.headers, redirects, currentUrl);
  const contentType = response.headers.get('content-type') ?? '';
  let rawHtml = '';
  if (contentType.includes('text/html') || contentType.includes('text/plain')) {
    const buf = await response.arrayBuffer();
    const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    rawHtml = new TextDecoder('utf-8').decode(slice);
  } else {
    try {
      await response.body?.cancel();
    } catch {
      // Ignore
    }
  }

  const formattedHtml = contentType.includes('text/html') ? formatHtmlForDiff(rawHtml) : rawHtml;
  const details = contentType.includes('text/html')
    ? extractHtmlDetails(rawHtml)
    : { title: null, metaTags: [], assets: [] };

  return {
    requestedUrl: targetUrl,
    finalUrl: currentUrl,
    ok: response.ok,
    initialStatus,
    finalStatus: response.status,
    statusText: response.statusText || (response.status === 200 ? 'OK' : ''),
    latencyMs,
    redirects,
    embeddable: embedEval.embeddable,
    embedBlockReason: embedEval.reason,
    isVercelSso: embedEval.isVercelSso,
    headers: headersObj,
    title: details.title,
    metaTags: details.metaTags,
    assets: details.assets,
    htmlLength: rawHtml.length,
    html: formattedHtml,
  };
}

async function startServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/inspect', async (req, res) => {
    const urlParam = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const bypassParam =
      typeof req.query.bypass === 'string' ? req.query.bypass.trim() : undefined;

    if (!urlParam) {
      res.status(400).json({ error: 'Missing required "url" query parameter.' });
      return;
    }

    try {
      const result = await inspectUrl(urlParam, bypassParam);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to inspect URL.';
      res.status(200).json({
        requestedUrl: urlParam,
        finalUrl: urlParam,
        ok: false,
        initialStatus: 0,
        finalStatus: 0,
        statusText: 'Network Error',
        latencyMs: 0,
        redirects: [],
        embeddable: false,
        embedBlockReason: message,
        isVercelSso: false,
        headers: {},
        title: null,
        metaTags: [],
        assets: [],
        htmlLength: 0,
        html: '',
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AppCompare server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
