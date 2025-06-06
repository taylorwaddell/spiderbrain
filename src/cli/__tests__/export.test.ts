import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Node } from "../../core/types.js";
import chalk from "chalk";
import { exportCommand } from "../commands/export.js";
import fs from "fs/promises";
import path from "path";

// We'll import the CLI or the export action when refactored for testability
// import { exportCommand } from "../commands/export.js";

// Mocks and helpers will be set up here

// Mock dependencies
vi.mock("fs/promises");
vi.mock("path");

describe("export command", () => {
  let mockStorage: any;
  let consoleOutput: string[];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });

    // Mock storage
    mockStorage = {
      initialize: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
    };

    // Mock file system operations
    (fs.writeFile as any).mockResolvedValue(undefined);
    (fs.mkdir as any).mockResolvedValue(undefined);
    (path.dirname as any).mockReturnValue("test/dir");
  });

  it("should export nodes in JSON format to stdout", async () => {
    const mockNodes: Node[] = [
      {
        id: "1",
        timestamp: Date.now(),
        raw_text: "Test content",
        tags: ["test"],
        metadata: { title: "Test Node" },
      },
    ];

    mockStorage.list.mockResolvedValue(mockNodes);

    await exportCommand(mockStorage as any, { format: "json" });

    expect(mockStorage.initialize).toHaveBeenCalled();
    expect(mockStorage.load).toHaveBeenCalled();
    expect(mockStorage.list).toHaveBeenCalled();
    expect(consoleOutput[0]).toBe(JSON.stringify(mockNodes, null, 2));
  });

  it("should export nodes in text format to stdout", async () => {
    const mockNodes: Node[] = [
      {
        id: "1",
        timestamp: Date.now(),
        raw_text: "Test content",
        tags: ["test"],
        metadata: { title: "Test Node" },
      },
    ];

    mockStorage.list.mockResolvedValue(mockNodes);

    await exportCommand(mockStorage as any, { format: "text" });

    expect(mockStorage.initialize).toHaveBeenCalled();
    expect(mockStorage.load).toHaveBeenCalled();
    expect(mockStorage.list).toHaveBeenCalled();

    // Strip ANSI color codes and normalize newlines
    const strippedOutput = consoleOutput[0]
      .replace(/\u001b\[\d+m/g, "")
      .replace(/\n/g, " ");

    expect(strippedOutput).toMatch(/ID:.*1/);
    expect(strippedOutput).toMatch(/Content:.*Test content/);
    expect(strippedOutput).toMatch(/Tags:.*test/);
    expect(strippedOutput).toMatch(/Title:.*Test Node/);
  });

  it("should export nodes in JSON format to a file", async () => {
    const mockNodes: Node[] = [
      {
        id: "1",
        timestamp: Date.now(),
        raw_text: "Test content",
        tags: ["test"],
        metadata: { title: "Test Node" },
      },
    ];

    mockStorage.list.mockResolvedValue(mockNodes);

    const outputPath = "test/output.json";
    await exportCommand(mockStorage as any, {
      format: "json",
      output: outputPath,
    });

    expect(mockStorage.initialize).toHaveBeenCalled();
    expect(mockStorage.load).toHaveBeenCalled();
    expect(mockStorage.list).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(
      outputPath,
      JSON.stringify(mockNodes, null, 2),
      "utf-8"
    );
  });

  it("should export nodes in text format to a file", async () => {
    // TODO: Implement
  });

  it("should handle export with empty graph", async () => {
    // TODO: Implement
  });

  it("should handle export with multiple nodes", async () => {
    // TODO: Implement
  });

  it("should handle invalid export format", async () => {
    // TODO: Implement
  });

  it("should handle invalid file path error", async () => {
    // TODO: Implement
  });

  it("should handle insufficient permissions error", async () => {
    // TODO: Implement
  });

  it("should handle uninitialized storage error", async () => {
    // TODO: Implement
  });
});
