import { DiffLine } from '../types';

export function buildTargetUrl(baseUrl: string, routePath: string, bypassSecret?: string): string {
  const trimmedBase = baseUrl.trim();
  if (!trimmedBase) return '';

  try {
    const normalized = /^https?:\/\//i.test(trimmedBase) ? trimmedBase : `https://${trimmedBase}`;
    const url = new URL(normalized);

    const cleanPath = routePath.trim();
    if (cleanPath && cleanPath !== '/') {
      const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
      const pathObj = new URL(normalizedPath, url.origin);
      url.pathname = pathObj.pathname;
      pathObj.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      if (pathObj.hash) {
        url.hash = pathObj.hash;
      }
    }

    if (bypassSecret && bypassSecret.trim()) {
      url.searchParams.set('x-vercel-protection-bypass', bypassSecret.trim());
      url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    }

    return url.toString();
  } catch {
    return trimmedBase;
  }
}

export function formatHostLabel(rawUrl: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return rawUrl;
  }
}

export function computeLineDiff(leftText: string, rightText: string): {
  lines: DiffLine[];
  added: number;
  removed: number;
  equal: number;
} {
  const leftLines = leftText ? leftText.split(/\r?\n/) : [];
  const rightLines = rightText ? rightText.split(/\r?\n/) : [];

  const n = leftLines.length;
  const m = rightLines.length;

  // Guard against overly huge payloads in LCS DP table
  if (n * m > 250000) {
    const fallbackLines: DiffLine[] = [];
    const maxLen = Math.max(n, m);
    let added = 0;
    let removed = 0;
    let equal = 0;
    for (let i = 0; i < maxLen; i++) {
      const l = leftLines[i];
      const r = rightLines[i];
      if (l === r && l !== undefined) {
        fallbackLines.push({ type: 'equal', content: l, leftLineNumber: i + 1, rightLineNumber: i + 1 });
        equal++;
      } else {
        if (l !== undefined) {
          fallbackLines.push({ type: 'removed', content: l, leftLineNumber: i + 1, rightLineNumber: null });
          removed++;
        }
        if (r !== undefined) {
          fallbackLines.push({ type: 'added', content: r, leftLineNumber: null, rightLineNumber: i + 1 });
          added++;
        }
      }
    }
    return { lines: fallbackLines, added, removed, equal };
  }

  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (leftLines[i] === rightLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1];
      }
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  let equal = 0;

  while (i < n && j < m) {
    if (leftLines[i] === rightLines[j]) {
      lines.push({
        type: 'equal',
        content: leftLines[i],
        leftLineNumber: i + 1,
        rightLineNumber: j + 1,
      });
      equal++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lines.push({
        type: 'removed',
        content: leftLines[i],
        leftLineNumber: i + 1,
        rightLineNumber: null,
      });
      removed++;
      i++;
    } else {
      lines.push({
        type: 'added',
        content: rightLines[j],
        leftLineNumber: null,
        rightLineNumber: j + 1,
      });
      added++;
      j++;
    }
  }

  while (i < n) {
    lines.push({
      type: 'removed',
      content: leftLines[i],
      leftLineNumber: i + 1,
      rightLineNumber: null,
    });
    removed++;
    i++;
  }

  while (j < m) {
    lines.push({
      type: 'added',
      content: rightLines[j],
      leftLineNumber: null,
      rightLineNumber: j + 1,
    });
    added++;
    j++;
  }

  return { lines, added, removed, equal };
}
