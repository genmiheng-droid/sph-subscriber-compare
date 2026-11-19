import { RefreshCw } from 'lucide-react';
import { CompareTab } from '../types';

interface TopBarProps {
  activeTab: CompareTab;
  onSelectTab: (tab: CompareTab) => void;
  onRefreshAll: () => void;
  isInspecting: boolean;
}

const NAV_ITEMS: Array<{ id: CompareTab; label: string }> = [
  { id: 'split', label: 'Split Preview' },
  { id: 'overlay', label: 'Overlay & Slider' },
  { id: 'inspector', label: 'Headers & Assets' },
  { id: 'diff', label: 'HTML Diff' },
];

export function TopBar({ activeTab, onSelectTab, onRefreshAll, isInspecting }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0">
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('split');
        }}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        AppCompare
      </a>

      <nav aria-label="Comparison Views" className="flex items-center gap-6 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative py-4 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
                active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-slate-900"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onRefreshAll}
          disabled={isInspecting}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-60 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isInspecting ? 'animate-spin' : ''}`} />
          <span>{isInspecting ? 'Inspecting' : 'Refresh Comparison'}</span>
        </button>
      </div>
    </header>
  );
}
