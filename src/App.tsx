import { useCallback, useEffect, useMemo, useState } from 'react';
import { CompareTab, InspectionResult, ViewportPreset } from './types';
import { buildTargetUrl } from './utils/diff';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { SplitView } from './components/SplitView';
import { OverlayView } from './components/OverlayView';
import { InspectorView } from './components/InspectorView';
import { HtmlDiffView } from './components/HtmlDiffView';

const DEFAULT_LEFT_URL = 'https://sph-subscriber.vercel.app/';
const DEFAULT_RIGHT_URL = 'https://sph-subscriber-2.vercel.app/';

async function fetchInspection(url: string, bypassSecret: string): Promise<InspectionResult> {
  const params = new URLSearchParams({ url });
  if (bypassSecret.trim()) {
    params.set('bypass', bypassSecret.trim());
  }
  const res = await fetch(`/api/inspect?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Inspector failed with HTTP ${res.status}`);
  }
  return res.json();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<CompareTab>('split');
  const [leftUrl, setLeftUrl] = useState(DEFAULT_LEFT_URL);
  const [rightUrl, setRightUrl] = useState(DEFAULT_RIGHT_URL);
  const [routePath, setRoutePath] = useState('/');
  const [viewport, setViewport] = useState<ViewportPreset>('fill');
  const [bypassSecret, setBypassSecret] = useState('');
  const [showBypassInput, setShowBypassInput] = useState(false);

  const [leftInspection, setLeftInspection] = useState<InspectionResult | null>(null);
  const [rightInspection, setRightInspection] = useState<InspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const [leftReloadKey, setLeftReloadKey] = useState(0);
  const [rightReloadKey, setRightReloadKey] = useState(0);
  const [forceLeftIframe, setForceLeftIframe] = useState(false);
  const [forceRightIframe, setForceRightIframe] = useState(false);

  const leftTargetUrl = useMemo(
    () => buildTargetUrl(leftUrl, routePath, bypassSecret),
    [leftUrl, routePath, bypassSecret]
  );

  const rightTargetUrl = useMemo(
    () => buildTargetUrl(rightUrl, routePath, bypassSecret),
    [rightUrl, routePath, bypassSecret]
  );

  const runInspection = useCallback(async (lUrl: string, rUrl: string, bypass: string) => {
    setIsInspecting(true);
    try {
      const [leftRes, rightRes] = await Promise.all([
        fetchInspection(lUrl, bypass),
        fetchInspection(rUrl, bypass),
      ]);
      setLeftInspection(leftRes);
      setRightInspection(rightRes);
    } catch {
      // Errors are surfaced cleanly per pane via InspectionResult
    } finally {
      setIsInspecting(false);
    }
  }, []);

  useEffect(() => {
    runInspection(leftTargetUrl, rightTargetUrl, bypassSecret);
  }, [leftTargetUrl, rightTargetUrl, bypassSecret, runInspection]);

  const handleApplyUrls = (nextLeft: string, nextRight: string, nextPath: string) => {
    setLeftUrl(nextLeft.trim() || DEFAULT_LEFT_URL);
    setRightUrl(nextRight.trim() || DEFAULT_RIGHT_URL);
    setRoutePath(nextPath.trim() || '/');
    setForceLeftIframe(false);
    setForceRightIframe(false);
    setLeftReloadKey((k) => k + 1);
    setRightReloadKey((k) => k + 1);
  };

  const handleSwapUrls = () => {
    setLeftUrl(rightUrl);
    setRightUrl(leftUrl);
    setLeftInspection(rightInspection);
    setRightInspection(leftInspection);
    setForceLeftIframe(forceRightIframe);
    setForceRightIframe(forceLeftIframe);
  };

  const handleRefreshAll = () => {
    setLeftReloadKey((k) => k + 1);
    setRightReloadKey((k) => k + 1);
    runInspection(leftTargetUrl, rightTargetUrl, bypassSecret);
  };

  const handleApplyBypass = (secret: string) => {
    setBypassSecret(secret.trim());
    setForceLeftIframe(false);
    setForceRightIframe(false);
    setLeftReloadKey((k) => k + 1);
    setRightReloadKey((k) => k + 1);
  };

  return (
    <div id="top" className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefreshAll={handleRefreshAll}
        isInspecting={isInspecting}
      />

      <Toolbar
        leftUrl={leftUrl}
        rightUrl={rightUrl}
        routePath={routePath}
        viewport={viewport}
        bypassSecret={bypassSecret}
        showBypassInput={showBypassInput}
        onToggleBypassInput={() => setShowBypassInput((s) => !s)}
        onApplyUrls={handleApplyUrls}
        onSwapUrls={handleSwapUrls}
        onChangeViewport={setViewport}
        onApplyBypassSecret={handleApplyBypass}
      />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'split' && (
          <SplitView
            leftTargetUrl={leftTargetUrl}
            rightTargetUrl={rightTargetUrl}
            leftInspection={leftInspection}
            rightInspection={rightInspection}
            isInspecting={isInspecting}
            viewport={viewport}
            leftReloadKey={leftReloadKey}
            rightReloadKey={rightReloadKey}
            forceLeftIframe={forceLeftIframe}
            forceRightIframe={forceRightIframe}
            onReloadLeft={() => setLeftReloadKey((k) => k + 1)}
            onReloadRight={() => setRightReloadKey((k) => k + 1)}
            onForceLeftIframe={() => setForceLeftIframe(true)}
            onForceRightIframe={() => setForceRightIframe(true)}
            onOpenBypass={() => setShowBypassInput(true)}
          />
        )}

        {activeTab === 'overlay' && (
          <OverlayView
            leftTargetUrl={leftTargetUrl}
            rightTargetUrl={rightTargetUrl}
            leftInspection={leftInspection}
            rightInspection={rightInspection}
            forceLeftIframe={forceLeftIframe}
            forceRightIframe={forceRightIframe}
            onForceLeftIframe={() => setForceLeftIframe(true)}
            onForceRightIframe={() => setForceRightIframe(true)}
            onOpenBypass={() => setShowBypassInput(true)}
          />
        )}

        {activeTab === 'inspector' && (
          <InspectorView
            leftInspection={leftInspection}
            rightInspection={rightInspection}
            isInspecting={isInspecting}
          />
        )}

        {activeTab === 'diff' && (
          <HtmlDiffView
            leftInspection={leftInspection}
            rightInspection={rightInspection}
            isInspecting={isInspecting}
          />
        )}
      </main>
    </div>
  );
}
