export type CompareTab = 'split' | 'overlay' | 'inspector' | 'diff';

export type ViewportPreset = 'fill' | 'desktop' | 'tablet' | 'mobile';

export interface RedirectHop {
  url: string;
  status: number;
  location: string | null;
}

export interface AssetReference {
  type: 'script' | 'stylesheet' | 'font' | 'preconnect';
  href: string;
  crossorigin?: boolean;
}

export interface MetaTagInfo {
  key: string;
  value: string;
}

export interface InspectionResult {
  requestedUrl: string;
  finalUrl: string;
  ok: boolean;
  initialStatus: number;
  finalStatus: number;
  statusText: string;
  latencyMs: number;
  redirects: RedirectHop[];
  embeddable: boolean;
  embedBlockReason: string | null;
  isVercelSso: boolean;
  headers: Record<string, string>;
  title: string | null;
  metaTags: MetaTagInfo[];
  assets: AssetReference[];
  htmlLength: number;
  html: string;
  error?: string;
}

export interface DiffLine {
  type: 'equal' | 'added' | 'removed';
  content: string;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
}
