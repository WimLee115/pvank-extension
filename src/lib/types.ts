export interface CapturePayload {
  url: string;
  finalUrl: string;
  title: string;
  html: string;
  capturedAt: string;
  userAgent: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  language: string;
  referrer: string;
}

export interface ProofManifest {
  pvank: {
    version: string;
    extension: string;
    target: "chrome" | "firefox";
  };
  capturedAt: string;
  url: string;
  finalUrl: string;
  title: string;
  files: Record<string, { sha256: string; bytes: number }>;
  digest: string;
  notes?: string;
}

export type Msg =
  | { type: "seal"; tabId: number }
  | { type: "capture-dom" }
  | { type: "capture-dom:result"; payload: CapturePayload }
  | { type: "progress"; step: string; pct: number }
  | { type: "done"; filename: string }
  | { type: "error"; message: string };
