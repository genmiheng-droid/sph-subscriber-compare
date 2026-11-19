import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RotateCw, Lock, Eye, KeyRound } from 'lucide-react';
import { InspectionResult, ViewportPreset } from '../types';
import { formatHostLabel } from '../utils/diff';

interface PaneFrameProps {
  side: 'Left' | 'Right';
  targetUrl: string;
  inspection: InspectionResult | null;
  isInspecting: boolean;
  viewport: ViewportPreset;
  reloadKey: number;
  forceIframe: boolean;
  onReload: () => void;
  onForceIframe: () => void;
  onOpenBypass: () => void;
  disablePointerEvents?: boolean;
}

const PRESET_DIMENSIONS: Record<Exclude<ViewportPreset, 'fill'>, { width: number; height: number }> = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

export function PaneFrame({
  side,
  targetUrl,
  inspection,
  isInspecting,
  viewport,
  reloadKey,
  forceIframe,
  onReload,
  onForceIframe,
  onOpenBypass,
  disablePointerEvents = false,
}: PaneFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setIframeLoaded(false);
  }, [targetUrl, reloadKey, forceIframe]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isBlockedByHeaders = Boolean(inspection && !inspection.embeddable && !forceIframe);

  const statusColorClass = !inspection
    ? 'text-slate-500'
    : inspection.finalStatus >= 200 && inspection.finalStatus < 300
      ? 'text-emerald-700'
      : inspection.finalStatus >= 300 && inspection.finalStatus < 400
        ? 'text-amber-700'
        : 'text-red-700';

  const statusLabel = !inspection
    ? isInspecting
      ? 'Inspecting...'
      : 'Pending'
    : inspection.error
      ? 'Error'
      : `HTTP ${inspection.initialStatus}${
          inspection.redirects.length > 0 ? ` → ${inspection.finalStatus}` : ''
        }`;

  let frameWidth = '100%';
  let frameHeight = '100%';
  let scale = 1;

  if (viewport !== 'fill') {
    const preset = PRESET_DIMENSIONS[viewport];
    frameWidth = `${preset.width}px`;
    frameHeight = `${preset.height}px`;
    if (containerSize.width > 0) {
      const availableW = Math.max(200, containerSize.width - 32);
      const availableH = Math.max(200, containerSize.height - 32);
      const scaleW = availableW / preset.width;
      const scaleH = availableH / preset.height;
      scale = Math.min(1, viewport === 'desktop' ? scaleW : Math.min(scaleW, scaleH));
    }
  }

  return (
    <div className="flex flex-col h-full min-w-0 bg-slate-50">
      <div className="h-10 px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <span className="font-display font-semibold text-slate-900 shrink-0">{side}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="font-mono text-slate-600 truncate" title={targetUrl}>
            {formatHostLabel(targetUrl)}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className={`font-mono font-medium tabular-nums shrink-0 ${statusColorClass}`}>
            {statusLabel}
          </span>
          {inspection && inspection.latencyMs > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300 hidden sm:inline">
                ·
              </span>
              <span className="font-mono text-slate-500 tabular-nums shrink-0 hidden sm:inline">
                {inspection.latencyMs} ms
              </span>
            </>
          )}
          {viewport !== 'fill' && (
            <>
              <span aria-hidden="true" className="text-slate-300 hidden md:inline">
                ·
              </span>
              <span className="font-mono text-slate-500 tabular-nums shrink-0 hidden md:inline">
                {PRESET_DIMENSIONS[viewport].width}px ({Math.round(scale * 100)}%)
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onReload}
            title={`Reload ${side} frame`}
            aria-label={`Reload ${side} frame`}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open ${side} URL in new tab`}
            aria-label={`Open ${side} URL in new tab`}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 min-h-0 overflow-auto ${
          viewport === 'fill' ? 'p-0' : 'p-4 flex justify-center items-start'
        }`}
      >
        {isBlockedByHeaders ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2.5 text-amber-700 mb-3">
                <Lock className="w-4 h-4 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Iframe Embedding Restricted
                </h3>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {inspection?.embedBlockReason}
              </p>

              {inspection && inspection.redirects.length > 0 && (
                <div className="mb-5 py-3 px-3.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-700 space-y-1.5">
                  <div className="text-slate-500">Redirect Chain</div>
                  {inspection.redirects.map((hop, idx) => (
                    <div key={idx} className="truncate" title={hop.location ?? hop.url}>
                      HTTP {hop.status} → {hop.location ?? 'Unknown'}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>

                {inspection?.isVercelSso && (
                  <button
                    type="button"
                    onClick={onOpenBypass}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Bypass Secret</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onForceIframe}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Try Direct Iframe</span>
                </button>
              </div>
            </div>
          </div>
        ) : viewport === 'fill' ? (
          <div className="relative w-full h-full bg-white">
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs text-slate-500 pointer-events-none">
                Loading {formatHostLabel(targetUrl)}...
              </div>
            )}
            <iframe
              key={`${targetUrl}-${reloadKey}-${forceIframe}`}
              src={targetUrl}
              title={`${side} deployment preview`}
              onLoad={() => setIframeLoaded(true)}
              className={`w-full h-full border-0 bg-white ${
                disablePointerEvents ? 'pointer-events-none' : ''
              }`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        ) : (
          <div
            style={{
              width: `${PRESET_DIMENSIONS[viewport].width * scale}px`,
              height: `${PRESET_DIMENSIONS[viewport].height * scale}px`,
            }}
            className="relative shrink-0"
          >
            <div
              style={{
                width: frameWidth,
                height: frameHeight,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs"
            >
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-sm text-slate-500 pointer-events-none">
                  Loading {formatHostLabel(targetUrl)}...
                </div>
              )}
              <iframe
                key={`${targetUrl}-${reloadKey}-${forceIframe}`}
                src={targetUrl}
                title={`${side} deployment preview`}
                onLoad={() => setIframeLoaded(true)}
                className={`w-full h-full border-0 bg-white ${
                  disablePointerEvents ? 'pointer-events-none' : ''
                }`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
