import { InspectionResult } from '../types';
import { formatHostLabel } from '../utils/diff';

interface InspectorViewProps {
  leftInspection: InspectionResult | null;
  rightInspection: InspectionResult | null;
  isInspecting: boolean;
}

export function InspectorView({
  leftInspection,
  rightInspection,
  isInspecting,
}: InspectorViewProps) {
  if (isInspecting && !leftInspection && !rightInspection) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse" />
          <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const allHeaderKeys = Array.from(
    new Set([
      ...Object.keys(leftInspection?.headers ?? {}),
      ...Object.keys(rightInspection?.headers ?? {}),
    ])
  ).sort();

  const allMetaKeys = Array.from(
    new Set([
      ...(leftInspection?.metaTags.map((m) => m.key) ?? []),
      ...(rightInspection?.metaTags.map((m) => m.key) ?? []),
    ])
  );

  const getMetaValue = (res: InspectionResult | null, key: string) =>
    res?.metaTags.find((m) => m.key === key)?.value ?? null;

  const summaryRows = [
    {
      label: 'Initial HTTP Status',
      left: leftInspection ? `${leftInspection.initialStatus} ${leftInspection.statusText}` : '—',
      right: rightInspection ? `${rightInspection.initialStatus} ${rightInspection.statusText}` : '—',
    },
    {
      label: 'Final HTTP Status',
      left: leftInspection ? `${leftInspection.finalStatus}` : '—',
      right: rightInspection ? `${rightInspection.finalStatus}` : '—',
    },
    {
      label: 'Response Latency',
      left: leftInspection ? `${leftInspection.latencyMs} ms` : '—',
      right: rightInspection ? `${rightInspection.latencyMs} ms` : '—',
    },
    {
      label: 'Iframe Embeddable',
      left: leftInspection ? (leftInspection.embeddable ? 'Yes' : 'Blocked') : '—',
      right: rightInspection ? (rightInspection.embeddable ? 'Yes' : 'Blocked') : '—',
    },
    {
      label: 'Redirect Hops',
      left: leftInspection ? `${leftInspection.redirects.length}` : '—',
      right: rightInspection ? `${rightInspection.redirects.length}` : '—',
    },
    {
      label: 'HTML Payload Size',
      left: leftInspection ? `${leftInspection.htmlLength.toLocaleString()} bytes` : '—',
      right: rightInspection ? `${rightInspection.htmlLength.toLocaleString()} bytes` : '—',
    },
    {
      label: 'Document Title',
      left: leftInspection?.title ?? '—',
      right: rightInspection?.title ?? '—',
    },
  ];

  return (
    <div className="flex-1 overflow-auto p-6 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Response &amp; Framing Overview
            </h2>
            <span className="text-xs text-slate-500">
              Server-side HTTP probe
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-5 font-medium w-48">Attribute</th>
                  <th className="py-2.5 px-5 font-medium">
                    Left · {leftInspection ? formatHostLabel(leftInspection.requestedUrl) : '—'}
                  </th>
                  <th className="py-2.5 px-5 font-medium">
                    Right · {rightInspection ? formatHostLabel(rightInspection.requestedUrl) : '—'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {summaryRows.map((row) => {
                  const differs = row.left !== row.right;
                  return (
                    <tr key={row.label} className={differs ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-2.5 px-5 font-medium text-slate-700">{row.label}</td>
                      <td className="py-2.5 px-5 font-mono tabular-nums text-slate-900 break-all">
                        {row.left}
                      </td>
                      <td className="py-2.5 px-5 font-mono tabular-nums text-slate-900 break-all">
                        {row.right}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              HTTP Response Headers
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {allHeaderKeys.length} headers inspected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-5 font-medium w-56">Header</th>
                  <th className="py-2.5 px-5 font-medium">Left Value</th>
                  <th className="py-2.5 px-5 font-medium">Right Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allHeaderKeys.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-5 text-center text-slate-500">
                      No response headers captured yet.
                    </td>
                  </tr>
                ) : (
                  allHeaderKeys.map((key) => {
                    const lv = leftInspection?.headers[key] ?? '—';
                    const rv = rightInspection?.headers[key] ?? '—';
                    const differs = lv !== rv;
                    return (
                      <tr key={key} className={differs ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-5 font-mono font-medium text-slate-700">{key}</td>
                        <td className="py-2.5 px-5 font-mono text-slate-900 break-all">{lv}</td>
                        <td className="py-2.5 px-5 font-mono text-slate-900 break-all">{rv}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Document Metadata &amp; Assets
            </h2>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {allMetaKeys.length} meta tags
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <th className="py-2.5 px-5 font-medium w-56">Meta Key</th>
                  <th className="py-2.5 px-5 font-medium">Left Content</th>
                  <th className="py-2.5 px-5 font-medium">Right Content</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allMetaKeys.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 px-5 text-center text-slate-500">
                      No HTML meta tags available (e.g., if a deployment redirected to login).
                    </td>
                  </tr>
                ) : (
                  allMetaKeys.map((key) => {
                    const lv = getMetaValue(leftInspection, key) ?? '—';
                    const rv = getMetaValue(rightInspection, key) ?? '—';
                    const differs = lv !== rv;
                    return (
                      <tr key={key} className={differs ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-5 font-mono font-medium text-slate-700">{key}</td>
                        <td className="py-2.5 px-5 text-slate-900 break-words">{lv}</td>
                        <td className="py-2.5 px-5 text-slate-900 break-words">{rv}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-t border-slate-200">
            <div className="p-5">
              <h3 className="font-display text-xs font-semibold text-slate-900 mb-3">
                Left Scripts &amp; Stylesheets ({leftInspection?.assets.length ?? 0})
              </h3>
              {leftInspection && leftInspection.assets.length > 0 ? (
                <ul className="space-y-1.5 font-mono text-xs text-slate-700">
                  {leftInspection.assets.map((asset, idx) => (
                    <li key={idx} className="flex items-baseline gap-2 break-all">
                      <span className="text-slate-400 shrink-0 w-20">{asset.type}</span>
                      <span>{asset.href}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">No HTML asset references captured.</p>
              )}
            </div>

            <div className="p-5">
              <h3 className="font-display text-xs font-semibold text-slate-900 mb-3">
                Right Scripts &amp; Stylesheets ({rightInspection?.assets.length ?? 0})
              </h3>
              {rightInspection && rightInspection.assets.length > 0 ? (
                <ul className="space-y-1.5 font-mono text-xs text-slate-700">
                  {rightInspection.assets.map((asset, idx) => (
                    <li key={idx} className="flex items-baseline gap-2 break-all">
                      <span className="text-slate-400 shrink-0 w-20">{asset.type}</span>
                      <span>{asset.href}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500">
                  {rightInspection?.isVercelSso
                    ? 'Protected behind Vercel SSO login redirect.'
                    : 'No HTML asset references captured.'}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
