import { useState, useEffect, FormEvent } from 'react';
import { ArrowLeftRight, KeyRound, Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-react';
import { ViewportPreset } from '../types';

interface ToolbarProps {
  leftUrl: string;
  rightUrl: string;
  routePath: string;
  viewport: ViewportPreset;
  bypassSecret: string;
  showBypassInput: boolean;
  onToggleBypassInput: () => void;
  onApplyUrls: (left: string, right: string, path: string) => void;
  onSwapUrls: () => void;
  onChangeViewport: (preset: ViewportPreset) => void;
  onApplyBypassSecret: (secret: string) => void;
}

const VIEWPORT_OPTIONS: Array<{
  id: ViewportPreset;
  label: string;
  icon: typeof Maximize2;
}> = [
  { id: 'fill', label: 'Fill', icon: Maximize2 },
  { id: 'desktop', label: '1440px', icon: Monitor },
  { id: 'tablet', label: '768px', icon: Tablet },
  { id: 'mobile', label: '390px', icon: Smartphone },
];

export function Toolbar({
  leftUrl,
  rightUrl,
  routePath,
  viewport,
  bypassSecret,
  showBypassInput,
  onToggleBypassInput,
  onApplyUrls,
  onSwapUrls,
  onChangeViewport,
  onApplyBypassSecret,
}: ToolbarProps) {
  const [draftLeft, setDraftLeft] = useState(leftUrl);
  const [draftRight, setDraftRight] = useState(rightUrl);
  const [draftPath, setDraftPath] = useState(routePath);
  const [draftBypass, setDraftBypass] = useState(bypassSecret);

  useEffect(() => {
    setDraftLeft(leftUrl);
  }, [leftUrl]);

  useEffect(() => {
    setDraftRight(rightUrl);
  }, [rightUrl]);

  useEffect(() => {
    setDraftPath(routePath);
  }, [routePath]);

  useEffect(() => {
    setDraftBypass(bypassSecret);
  }, [bypassSecret]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApplyUrls(draftLeft, draftRight, draftPath);
  };

  const handleBypassSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApplyBypassSecret(draftBypass);
  };

  return (
    <section
      aria-label="Comparison Controls"
      className="bg-white border-b border-slate-200 px-6 py-3 shrink-0"
    >
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[320px] items-center gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor="left-url-input" className="sr-only">
              Left App URL
            </label>
            <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 focus-within:bg-white focus-within:border-slate-900 transition-colors">
              <span className="pl-3 pr-2 text-xs font-medium text-slate-500 select-none shrink-0">
                Left
              </span>
              <input
                id="left-url-input"
                type="url"
                value={draftLeft}
                onChange={(e) => setDraftLeft(e.target.value)}
                placeholder="https://example.com"
                className="w-full py-2 pr-3 bg-transparent font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onSwapUrls}
            title="Swap left and right deployments"
            aria-label="Swap left and right URLs"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <label htmlFor="right-url-input" className="sr-only">
              Right App URL
            </label>
            <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 focus-within:bg-white focus-within:border-slate-900 transition-colors">
              <span className="pl-3 pr-2 text-xs font-medium text-slate-500 select-none shrink-0">
                Right
              </span>
              <input
                id="right-url-input"
                type="url"
                value={draftRight}
                onChange={(e) => setDraftRight(e.target.value)}
                placeholder="https://preview.example.com"
                className="w-full py-2 pr-3 bg-transparent font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-40">
            <label htmlFor="shared-path-input" className="sr-only">
              Synced Route Path
            </label>
            <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 focus-within:bg-white focus-within:border-slate-900 transition-colors">
              <span className="pl-2.5 pr-1.5 text-xs font-medium text-slate-500 select-none shrink-0">
                Path
              </span>
              <input
                id="shared-path-input"
                type="text"
                value={draftPath}
                onChange={(e) => setDraftPath(e.target.value)}
                placeholder="/"
                className="w-full py-2 pr-2.5 bg-transparent font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Load URLs
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Viewport Preset"
            className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-md"
          >
            {VIEWPORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = viewport === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeViewport(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleBypassInput}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
              bypassSecret || showBypassInput
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Bypass Token</span>
          </button>
        </div>
      </form>

      {showBypassInput && (
        <form
          onSubmit={handleBypassSubmit}
          className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <label htmlFor="bypass-secret-input" className="text-xs font-medium text-slate-700 whitespace-nowrap">
              Vercel Protection Bypass Secret
            </label>
            <input
              id="bypass-secret-input"
              type="password"
              value={draftBypass}
              onChange={(e) => setDraftBypass(e.target.value)}
              placeholder="Paste x-vercel-protection-bypass token"
              className="flex-1 max-w-md px-3 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Apply Token
            </button>
            {bypassSecret && (
              <button
                type="button"
                onClick={() => {
                  setDraftBypass('');
                  onApplyBypassSecret('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
