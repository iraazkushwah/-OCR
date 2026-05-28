export interface OCRAlert {
  fragment: string;
  context: string;
  reason: string;
}

export interface OCRResult {
  markdown: string;
  confidenceEstimate: number;
  wordCount: number;
  alerts: OCRAlert[];
}

export interface FileData {
  id: string;
  name: string;
  size: string;
  type: string;
  base64: string;
  previewUrl: string | null;
  status: "idle" | "processing" | "completed" | "failed";
  error?: string;
  result?: OCRResult;
}
