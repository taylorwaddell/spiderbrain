import { Node } from "../types.js";

export type ExportFormat = "csv" | "json" | undefined;

export interface ExportOptions {
  format: ExportFormat;
  fields?: string[];
  dateFormat?: string;
  delimiter?: string;
  encoding?: string;
  outputPath?: string;
}

export interface ExportProgress {
  total: number;
  current: number;
  status: "preparing" | "exporting" | "writing" | "complete" | "error";
  error?: Error;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: Error;
  stats: {
    totalNodes: number;
    exportedNodes: number;
    skippedNodes: number;
  };
}
