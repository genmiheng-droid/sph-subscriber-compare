import { useState, useRef, useEffect, useCallback } from 'react';
import { Eye, KeyRound, ExternalLink, MoveHorizontal } from 'lucide-react';
import { InspectionResult } from '../types';
import { formatHostLabel } from '../utils/diff';

interface OverlayViewProps {
  leftTargetUrl: string;
  rightTargetUrl: string;
  leftInspection: InspectionResult | null;
  rightInspection: InspectionResult | null;
  forceLeftIframe: boolean;
  forceRightIframe: boolean;
  onForceLeftIframe: () => void;
  onForceRightIframe: () => void;
  onOpenBypass: () => void;
}

type OverlaySubMode = 'wipe' | 'onion';

export function OverlayView({
  leftTargetUrl,
  rightTargetUrl,
  leftInspection,
  rightInspection,
  forceLeftIframe,
  forceRightIframe,
  onForceLeftIframe,
  onForceRightIframe,
  onOpenBypass,
}: OverlayViewProps) {
  const [subMode, setSubMode] = useState<OverlaySubMode>('wipe');
  const [wipePercent, setWipePercent] = useState(50);
  const [opacityPercent, setOpacityPercent] = useState(50);
  const [diffBlend, setDiffBlend] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const leftBlocked = Boolean(leftInspection && !leftInspection.embeddable && !forceLeftIframe);
  const rightBlocked = Boolean(rightInspection && !rightInspection.embeddable && !forceRightIframe);

  const updateWipeFromX = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setWipePercent(Math.min(98, Math.max(2, Math.round(pct * 10) / 10)));
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: PointerEvent) => updateWipeFromX(e.clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, updateWipeFromX]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md">
            <button
              type="button"
              onClick={() => setSubMode('wipe')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                subMode === 'wipe' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split Wipe
            </button>
            <button
              type="button"
              onClick={() => setSubMode('onion')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                subMode === 'onion' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Onion Skin
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden md:flex items-center gap-2">
            <span>Left: {formatHostLabel(leftTargetUrl)}</span>
            <span aria-hidden="true">·</span>
            <span>Right: {formatHostLabel(rightTargetUrl)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {subMode === 'wipe' ? (
            <div className="flex items-center gap-2.5 text-xs">
              <label htmlFor="wipe-range" className="text-slate-600 font-medium">
                Wipe Position
              </label>
              <input
                id="wipe-range"
                type="range"
                min={2}
                max={98}
                value={wipePercent}
                onChange={(e) => setWipePercent(Number(e.target.value))}
                className="w-32 accent-slate-900 cursor-pointer"
              />
              <span className="font-mono tabular-nums text-slate-700 w-10 text-right">
                {Math.round(wipePercent)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2.5">
                <label htmlFor="opacity-range" className="text-slate-600 font-medium">
                  Right Opacity
                </label>
                <input
                  id="opacity-range"
                  type="range"
                  min={0}
                  max={100}
                  value={opacityPercent}
                  onChange={(e) => setOpacityPercent(Number(e.target.value))}
                  className="w-32 accent-slate-900 cursor-pointer"
                />
                <span className="font-mono tabular-nums text-slate-700 w-10 text-right">
                  {opacityPercent}%
                </span>
              </div>

              <label className="inline-flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={diffBlend}
                  onChange={(e) => setDiffBlend(e.target.checked)}
                  className="accent-slate-900 rounded cursor-pointer"
                />
                <span>Difference Blend</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {(leftBlocked || rightBlocked) ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
              Visual Overlay Unavailable While Framing Is Restricted
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {rightBlocked
                ? `Right deployment (${formatHostLabel(rightTargetUrl)}) cannot be embedded because ${rightInspection?.embedBlockReason}`
                : `Left deployment (${formatHostLabel(leftTargetUrl)}) cannot be embedded because ${leftInspection?.embedBlockReason}`}
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
              {(rightBlocked ? rightInspection?.isVercelSso : leftInspection?.isVercelSso) && (
                <button
                  type="button"
                  onClick={onOpenBypass}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enter Bypass Secret</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (leftBlocked) onForceLeftIframe();
                  if (rightBlocked) onForceRightIframe();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Try Direct Iframe Anyway</span>
              </button>
              <a
                href={rightBlocked ? rightTargetUrl : leftTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div ref={stageRef} className="relative flex-1 min-h-0 overflow-hidden bg-white select-none">
          <iframe
            src={leftTargetUrl}
            title="Left base layer"
            className={`absolute inset-0 w-full h-full border-0 bg-white ${
              isDragging ? 'pointer-events-none' : ''
            }`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />

          <div
            style={
              subMode === 'wipe'
                ? { clipPath: `inset(0 0 0 ${wipePercent}%)` }
                : {
                    opacity: opacityPercent / 100,
                    mixBlendMode: diffBlend ? 'difference' : 'normal',
                    pointerEvents: 'none',
                  }
            }
            className="absolute inset-0 w-full h-full"
          >
            <iframe
              src={rightTargetUrl}
              title="Right overlay layer"
              className={`w-full h-full border-0 bg-white ${
                isDragging || subMode === 'onion' ? 'pointer-events-none' : ''
              }`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>

          {subMode === 'wipe' && (
            <div
              style={{ left: `${wipePercent}%` }}
              onPointerDown={() => setIsDragging(true)}
              className="absolute inset-y-0 -translate-x-1/2 w-6 flex items-center justify-center cursor-ew-resize z-10"
            >
              <div className="w-0.5 h-full bg-slate-900" />
              <div className="absolute w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <MoveHorizontal className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
