import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigManager } from "../../config.js";
import { ExportService } from "../service.js";
import { Node } from "../../types.js";
import { promises as fs } from "fs";

describe("ExportService", () => {
  let exportService: ExportService;
  let testNodes: Node[];
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    mockConfigManager = {
      getDataDir: vi.fn().mockReturnValue("/test/data/dir"),
    } as any;

    exportService = new ExportService(mockConfigManager);
    testNodes = [
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
  });

  afterEach(async () => {
    // Clean up test files
    const files = await fs.readdir(".");
    for (const file of files) {
      if (
        file.startsWith("export_") &&
        (file.endsWith(".csv") || file.endsWith(".json"))
      ) {
        await fs.unlink(file);
      }
    }
    vi.clearAllMocks();
  });

  describe("exportToCSV", () => {
    it("should export nodes to CSV with default options", async () => {
      const result = await exportService.exportToCSV(testNodes, {
        format: "csv",
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
      expect(result.outputPath).toMatch(/\/test\/data\/dir\/export_\d+\.csv$/);
      expect(result.stats.exportedNodes).toBe(2);

      const content = await fs.readFile(result.outputPath!, "utf8");
      expect(content).toContain("id,timestamp,raw_text,tags");
      expect(content).toContain(
        "1,2024-01-01T12:00:00.000Z,Test node 1,test;node1"
      );
      expect(content).toContain(
        "2,2024-01-02T12:00:00.000Z,Test node 2,test;node2"
      );
    });

    it("should export nodes to CSV with custom options", async () => {
      const result = await exportService.exportToCSV(testNodes, {
        format: "csv",
        fields: ["id", "raw_text"],
        delimiter: ";",
        dateFormat: "yyyy-MM-dd",
        outputPath: "custom_export.csv",
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe("custom_export.csv");
      expect(result.stats.exportedNodes).toBe(2);

      const content = await fs.readFile(result.outputPath!, "utf8");
      expect(content).toContain("id;raw_text");
      expect(content).toContain("1;Test node 1");
      expect(content).toContain("2;Test node 2");
    });

    it("should handle export errors gracefully", async () => {
      const result = await exportService.exportToCSV(testNodes, {
        format: "csv",
        outputPath: "/invalid/path/export.csv",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.stats.exportedNodes).toBe(0);
    });
  });

  describe("exportToJSON", () => {
    it("should export nodes to JSON with default options", async () => {
      const result = await exportService.exportToJSON(testNodes, {
        format: "json",
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBeDefined();
      expect(result.outputPath).toMatch(/\/test\/data\/dir\/export_\d+\.json$/);
      expect(result.stats.exportedNodes).toBe(2);

      const content = await fs.readFile(result.outputPath!, "utf8");
      const data = JSON.parse(content);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty("id", "1");
      expect(data[0]).toHaveProperty("raw_text", "Test node 1");
      expect(data[0]).toHaveProperty("tags", ["test", "node1"]);
    });

    it("should export nodes to JSON with custom options", async () => {
      const result = await exportService.exportToJSON(testNodes, {
        format: "json",
        fields: ["id", "raw_text"],
        dateFormat: "yyyy-MM-dd",
        outputPath: "custom_export.json",
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe("custom_export.json");
      expect(result.stats.exportedNodes).toBe(2);

      const content = await fs.readFile(result.outputPath!, "utf8");
      const data = JSON.parse(content);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty("id", "1");
      expect(data[0]).toHaveProperty("raw_text", "Test node 1");
      expect(data[0]).not.toHaveProperty("tags");
    });

    it("should handle export errors gracefully", async () => {
      const result = await exportService.exportToJSON(testNodes, {
        format: "json",
        outputPath: "/invalid/path/export.json",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.stats.exportedNodes).toBe(0);
    });
  });
});
