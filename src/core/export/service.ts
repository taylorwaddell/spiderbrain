import {
  ExportOptions,
  ExportProgress,
  ExportProgressCallback,
  ExportResult,
} from "./types.js";

import { Node } from "../types.js";
import chalk from "chalk";
import { format } from "date-fns";
import { promises as fs } from "fs";
import { join } from "path";
import { stringify } from "csv-stringify/sync";

export class ExportService {
  private readonly DEFAULT_OPTIONS: Partial<ExportOptions> = {
    fields: ["id", "timestamp", "raw_text", "tags"],
    dateFormat: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
    delimiter: ",",
    encoding: "utf8",
  };

  async exportToCSV(
    nodes: Node[],
    options: ExportOptions,
    progressCallback?: ExportProgressCallback
  ): Promise<ExportResult> {
    const mergedOptions = this.mergeOptions(options);
    const result: ExportResult = {
      success: false,
      stats: {
        totalNodes: nodes.length,
        exportedNodes: 0,
        skippedNodes: 0,
      },
    };

    try {
      // Prepare data
      progressCallback?.({
        total: nodes.length,
        current: 0,
        status: "preparing",
      });

      const rows = nodes.map((node) => {
        const row: Record<string, string> = {};
        mergedOptions.fields!.forEach((field) => {
          if (field === "timestamp") {
            row[field] = new Date(node.timestamp).toISOString();
          } else if (field === "tags") {
            row[field] = node.tags.join(";");
          } else {
            row[field] = String(node[field as keyof Node] || "");
          }
        });
        return row;
      });

      // Generate CSV
      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "exporting",
      });

      const csv = stringify(rows, {
        header: true,
        delimiter: mergedOptions.delimiter,
      });

      // Write file
      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "writing",
      });

      const outputPath = mergedOptions.outputPath || `export_${Date.now()}.csv`;
      await fs.writeFile(outputPath, csv, {
        encoding: mergedOptions.encoding as BufferEncoding,
      });

      result.success = true;
      result.outputPath = outputPath;
      result.stats.exportedNodes = nodes.length;

      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "complete",
      });

      return result;
    } catch (error) {
      const exportError =
        error instanceof Error ? error : new Error(String(error));
      result.error = exportError;

      progressCallback?.({
        total: nodes.length,
        current: 0,
        status: "error",
        error: exportError,
      });

      return result;
    }
  }

  async exportToJSON(
    nodes: Node[],
    options: ExportOptions,
    progressCallback?: ExportProgressCallback
  ): Promise<ExportResult> {
    const mergedOptions = this.mergeOptions(options);
    const result: ExportResult = {
      success: false,
      stats: {
        totalNodes: nodes.length,
        exportedNodes: 0,
        skippedNodes: 0,
      },
    };

    try {
      // Prepare data
      progressCallback?.({
        total: nodes.length,
        current: 0,
        status: "preparing",
      });

      const data = nodes.map((node) => {
        const item: Record<string, any> = {};
        mergedOptions.fields!.forEach((field) => {
          if (field === "timestamp") {
            item[field] = new Date(node.timestamp).toISOString();
          } else {
            item[field] = node[field as keyof Node];
          }
        });
        return item;
      });

      // Generate JSON
      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "exporting",
      });

      const json = JSON.stringify(data, null, 2);

      // Write file
      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "writing",
      });

      const outputPath =
        mergedOptions.outputPath || `export_${Date.now()}.json`;
      await fs.writeFile(outputPath, json, {
        encoding: mergedOptions.encoding as BufferEncoding,
      });

      result.success = true;
      result.outputPath = outputPath;
      result.stats.exportedNodes = nodes.length;

      progressCallback?.({
        total: nodes.length,
        current: nodes.length,
        status: "complete",
      });

      return result;
    } catch (error) {
      const exportError =
        error instanceof Error ? error : new Error(String(error));
      result.error = exportError;

      progressCallback?.({
        total: nodes.length,
        current: 0,
        status: "error",
        error: exportError,
      });

      return result;
    }
  }

  private mergeOptions(options: ExportOptions): Required<ExportOptions> {
    const obj = {
      ...this.DEFAULT_OPTIONS,
      ...options,
    } as Required<ExportOptions>;

    if (!obj.fields?.length && this.DEFAULT_OPTIONS.fields) {
      obj.fields = this.DEFAULT_OPTIONS.fields
    }
    return obj
  }
}
