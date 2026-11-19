import { useRef, useState, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { InspectionResult, ViewportPreset } from '../types';
import { PaneFrame } from './PaneFrame';

interface SplitViewProps {
  leftTargetUrl: string;
  rightTargetUrl: string;
  leftInspection: InspectionResult | null;
  rightInspection: InspectionResult | null;
  isInspecting: boolean;
  viewport: ViewportPreset;
  leftReloadKey: number;
  rightReloadKey: number;
  forceLeftIframe: boolean;
  forceRightIframe: boolean;
  onReloadLeft: () => void;
  onReloadRight: () => void;
  onForceLeftIframe: () => void;
  onForceRightIframe: () => void;
  onOpenBypass: () => void;
}

export function SplitView({
  leftTargetUrl,
  rightTargetUrl,
  leftInspection,
  rightInspection,
  isInspecting,
  viewport,
  leftReloadKey,
  rightReloadKey,
  forceLeftIframe,
  forceRightIframe,
  onReloadLeft,
  onReloadRight,
  onForceLeftIframe,
  onForceRightIframe,
  onOpenBypass,
}: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(Math.min(80, Math.max(20, Math.round(pct * 10) / 10)));
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      updateSplitFromClientX(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateSplitFromClientX]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden select-none"
    >
      <div
        style={{ flexBasis: `${splitPercent}%` }}
        className="min-h-[360px] lg:min-h-0 lg:h-full min-w-0 flex-1 lg:flex-none flex flex-col border-b lg:border-b-0 border-slate-200"
      >
        <PaneFrame
          side="Left"
          targetUrl={leftTargetUrl}
          inspection={leftInspection}
          isInspecting={isInspecting}
          viewport={viewport}
          reloadKey={leftReloadKey}
          forceIframe={forceLeftIframe}
          onReload={onReloadLeft}
          onForceIframe={onForceLeftIframe}
          onOpenBypass={onOpenBypass}
          disablePointerEvents={isDragging}
        />
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize split panels"
        aria-valuenow={Math.round(splitPercent)}
        aria-valuemin={20}
        aria-valuemax={80}
        tabIndex={0}
        onPointerDown={() => setIsDragging(true)}
        onDoubleClick={() => setSplitPercent(50)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setSplitPercent((p) => Math.max(20, p - 2));
          } else if (e.key === 'ArrowRight') {
            setSplitPercent((p) => Math.min(80, p + 2));
          } else if (e.key === 'Home') {
            setSplitPercent(50);
          }
        }}
        title="Drag to resize panels (double-click to reset 50/50)"
        className={`hidden lg:flex w-2.5 shrink-0 items-center justify-center border-x border-slate-200 cursor-col-resize transition-colors focus-visible:outline-2 focus-visible:outline-slate-900 ${
          isDragging ? 'bg-slate-200' : 'bg-slate-100 hover:bg-slate-200'
        }`}
      >
        <GripVertical className="w-3.5 h-3.5 text-slate-400" />
      </div>

      <div className="min-h-[360px] lg:min-h-0 lg:h-full min-w-0 flex-1 flex flex-col">
        <PaneFrame
          side="Right"
          targetUrl={rightTargetUrl}
          inspection={rightInspection}
          isInspecting={isInspecting}
          viewport={viewport}
          reloadKey={rightReloadKey}
          forceIframe={forceRightIframe}
          onReload={onReloadRight}
          onForceIframe={onForceRightIframe}
          onOpenBypass={onOpenBypass}
          disablePointerEvents={isDragging}
        />
      </div>
    </div>
  );
}
