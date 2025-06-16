import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigManager } from "../../../core/config.js";
import { ExportService } from "../../../core/export/service.js";
import { NodeStorage } from "../../../core/storage.js";
import { exportCommand } from "../export.js";
import { promises as fs } from "fs";

// Mock dependencies
vi.mock("../../../core/storage.js");
vi.mock("../../../core/config.js");
vi.mock("../../../core/export/service.js");
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
  })),
}));

describe("exportCommand", () => {
  const mockNodes = [
    {
      id: "1",
      timestamp: new Date("2024-01-01T12:00:00Z").getTime(),
      raw_text: "Test node 1",
      tags: ["test", "node1"],
    },
    {
      id: "2",
      timestamp: new Date("2024-01-02T12:00:00Z").getTime(),
      raw_text: "Test node 2",
      tags: ["test", "node2"],
    },
  ];

  beforeEach(() => {
    // Mock NodeStorage
    vi.mocked(NodeStorage).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
          load: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue(mockNodes),
        } as any)
    );

    // Mock ConfigManager
    vi.mocked(ConfigManager).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
        } as any)
    );

    // Mock ExportService
    vi.mocked(ExportService).mockImplementation(
      () =>
        ({
          exportToCSV: vi.fn().mockResolvedValue({
            success: true,
            outputPath: "export_123.csv",
            stats: { totalNodes: 2, exportedNodes: 2, skippedNodes: 0 },
          }),
          exportToJSON: vi.fn().mockResolvedValue({
            success: true,
            outputPath: "export_123.json",
            stats: { totalNodes: 2, exportedNodes: 2, skippedNodes: 0 },
          }),
        } as any)
    );

    // Mock fs.writeFile
    vi.spyOn(fs, "writeFile").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should export nodes to CSV with default options", async () => {
    await exportCommand("csv", {});

    const exportService = vi.mocked(ExportService).mock.results[0].value;
    expect(exportService.exportToCSV).toHaveBeenCalledWith(
      mockNodes,
      expect.objectContaining({
        format: "csv",
        fields: undefined,
        delimiter: undefined,
        dateFormat: undefined,
        encoding: undefined,
        outputPath: undefined,
      })
    );
  });

  it("should export nodes to JSON with default options", async () => {
    await exportCommand("json", {});

    const exportService = vi.mocked(ExportService).mock.results[0].value;
    expect(exportService.exportToJSON).toHaveBeenCalledWith(
      mockNodes,
      expect.objectContaining({
        format: "json",
        fields: undefined,
        dateFormat: undefined,
        encoding: undefined,
        outputPath: undefined,
      })
    );
  });

  it("should export nodes to CSV with custom options", async () => {
    await exportCommand("csv", {
      fields: "id,raw_text",
      delimiter: ";",
      output: "custom.csv",
    });

    const exportService = vi.mocked(ExportService).mock.results[0].value;
    expect(exportService.exportToCSV).toHaveBeenCalledWith(
      mockNodes,
      expect.objectContaining({
        format: "csv",
        fields: ["id", "raw_text"],
        delimiter: ";",
        outputPath: "custom.csv",
      })
    );
  });

  it("should handle empty node list", async () => {
    vi.mocked(NodeStorage).mockImplementation(
      () =>
        ({
          initialize: vi.fn().mockResolvedValue(undefined),
          load: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue([]),
        } as any)
    );

    await exportCommand("csv", {});

    const exportService = vi.mocked(ExportService).mock.results[0].value;
    expect(exportService.exportToCSV).not.toHaveBeenCalled();
  });

  it("should handle export errors", async () => {
    vi.mocked(ExportService).mockImplementation(
      () =>
        ({
          exportToCSV: vi.fn().mockResolvedValue({
            success: false,
            error: new Error("Export failed"),
            stats: { totalNodes: 2, exportedNodes: 0, skippedNodes: 0 },
          }),
          exportToJSON: vi.fn().mockResolvedValue({
            success: false,
            error: new Error("Export failed"),
            stats: { totalNodes: 2, exportedNodes: 0, skippedNodes: 0 },
          }),
        } as any)
    );

    await exportCommand("csv", {});

    const exportService = vi.mocked(ExportService).mock.results[0].value;
    expect(exportService.exportToCSV).toHaveBeenCalled();
  });
});
