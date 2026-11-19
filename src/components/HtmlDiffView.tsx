import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { InspectionResult } from '../types';
import { computeLineDiff } from '../utils/diff';

interface HtmlDiffViewProps {
  leftInspection: InspectionResult | null;
  rightInspection: InspectionResult | null;
  isInspecting: boolean;
}

export function HtmlDiffView({
  leftInspection,
  rightInspection,
  isInspecting,
}: HtmlDiffViewProps) {
  const [changesOnly, setChangesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const leftSource = leftInspection?.html ?? '';
  const rightSource = rightInspection?.html ?? '';

  const diff = useMemo(() => computeLineDiff(leftSource, rightSource), [leftSource, rightSource]);

  const filteredLines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return diff.lines.filter((line) => {
      if (changesOnly && line.type === 'equal') return false;
      if (q && !line.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [diff.lines, changesOnly, searchQuery]);

  if (isInspecting && !leftInspection && !rightInspection) {
    return (
      <div className="flex-1 p-6 bg-slate-50">
        <div className="max-w-6xl mx-auto h-80 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
      <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-emerald-700 font-medium">+{diff.added} added</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-red-700 font-medium">−{diff.removed} removed</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-slate-500">{diff.equal} unchanged</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter source lines..."
              className="pl-8 pr-3 py-1.5 w-52 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={changesOnly}
              onChange={(e) => setChangesOnly(e.target.checked)}
              className="accent-slate-900 rounded cursor-pointer"
            />
            <span>Changes Only</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-lg overflow-hidden">
          {filteredLines.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-slate-500">
              {diff.lines.length === 0
                ? 'No HTML document source captured.'
                : 'No matching lines found for the active filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto font-mono text-xs leading-6">
              {filteredLines.map((line, index) => {
                const bgClass =
                  line.type === 'added'
                    ? 'bg-emerald-50 text-emerald-950'
                    : line.type === 'removed'
                      ? 'bg-red-50 text-red-950'
                      : 'text-slate-800 hover:bg-slate-50';
                const marker = line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ';

                return (
                  <div key={index} className={`flex border-b border-slate-100 last:border-b-0 ${bgClass}`}>
                    <span className="w-12 px-2 text-right select-none text-slate-400 border-r border-slate-200 tabular-nums shrink-0">
                      {line.leftLineNumber ?? ''}
                    </span>
                    <span className="w-12 px-2 text-right select-none text-slate-400 border-r border-slate-200 tabular-nums shrink-0">
                      {line.rightLineNumber ?? ''}
                    </span>
                    <span className="w-6 text-center select-none font-semibold shrink-0">
                      {marker}
                    </span>
                    <pre className="px-2 py-0 whitespace-pre-wrap break-all flex-1">
                      {line.content}
                    </pre>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
