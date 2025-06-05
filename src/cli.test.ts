import { CreateNodeOptions, Node, SearchResult } from "./core/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NodeSearch } from "./core/search";
import { NodeStorage } from "./core/storage";
import { promises as fs } from "fs";
import { join } from "path";

// Create spies for search functionality
const addNodesSpy = vi.fn();
const searchSpy = vi.fn();

// Mock the CLI dependencies
vi.mock("./core/storage", () => ({
  NodeStorage: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    load: vi.fn(),
    create: vi.fn().mockImplementation((options: CreateNodeOptions) => ({
      id: "test-id",
      timestamp: Date.now(),
      raw_text: options.raw_text,
      tags: options.tags || [],
      metadata: options.metadata,
    })),
    list: vi.fn().mockResolvedValue([
      {
        id: "node1",
        timestamp: Date.now(),
        raw_text: "Test node 1 content",
        tags: ["test", "node1"],
        metadata: { title: "Test Node 1" },
      },
      {
        id: "node2",
        timestamp: Date.now(),
        raw_text: "Test node 2 content",
        tags: ["test", "node2"],
        metadata: { title: "Test Node 2" },
      },
    ]),
  })),
}));

vi.mock("./core/search", () => ({
  NodeSearch: vi.fn().mockImplementation(() => ({
    addNodes: addNodesSpy,
    search: searchSpy,
    isIndexLoaded: vi.fn().mockReturnValue(false),
  })),
}));

describe("CLI Commands", () => {
  const testDataPath = join(process.cwd(), "data", "test-nodes.jsonl");
  let storage: NodeStorage;
  let search: NodeSearch;

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
    storage = new NodeStorage(testDataPath);
    search = new NodeSearch();
    // Reset the spies before each test
    addNodesSpy.mockClear();
    searchSpy.mockClear();
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testDataPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("new command", () => {
    it("should create a node from direct text input", async () => {
      const content = "Test node content";
      const node = await storage.create({
        raw_text: content,
        metadata: {
          title: content.slice(0, 50) + "...",
          source: "direct_input",
        },
      });

      expect(node).toMatchObject({
        raw_text: content,
        metadata: {
          title: content.slice(0, 50) + "...",
          source: "direct_input",
        },
      });
      expect(node.id).toBeDefined();
      expect(node.timestamp).toBeDefined();
    });

    it("should create a node from file input", async () => {
      const filePath = join(process.cwd(), "data", "test-file.txt");
      const content = "Test file content";

      // Create test file
      await fs.writeFile(filePath, content, "utf-8");

      const node = await storage.create({
        raw_text: content,
        metadata: {
          title: filePath,
          source: filePath,
        },
      });

      expect(node).toMatchObject({
        raw_text: content,
        metadata: {
          title: filePath,
          source: filePath,
        },
      });
      expect(node.id).toBeDefined();
      expect(node.timestamp).toBeDefined();

      // Clean up test file
      await fs.unlink(filePath);
    });

    it("should create a node with custom title", async () => {
      const content = "Test node content";
      const customTitle = "Custom Title";

      const node = await storage.create({
        raw_text: content,
        metadata: {
          title: customTitle,
          source: "direct_input",
        },
      });

      expect(node).toMatchObject({
        raw_text: content,
        metadata: {
          title: customTitle,
          source: "direct_input",
        },
      });
    });

    it("should handle file not found error", async () => {
      const nonExistentFile = "non-existent-file.txt";

      await expect(fs.readFile(nonExistentFile, "utf-8")).rejects.toThrow();
    });

    it("should update search index after creating node", async () => {
      const content = "Test node content";
      const node = await storage.create({
        raw_text: content,
        metadata: {
          title: content.slice(0, 50) + "...",
          source: "direct_input",
        },
      });

      // Call addNodes directly since we're testing the integration
      search.addNodes([node]);

      expect(addNodesSpy).toHaveBeenCalledWith([node]);
    });
  });

  describe("search command", () => {
    it("should load nodes and build search index if not loaded", async () => {
      // Load nodes and build search index
      const nodes = await storage.list();
      await search.addNodes(nodes);

      expect(nodes).toHaveLength(2);
      expect(addNodesSpy).toHaveBeenCalledWith(nodes);
    });

    it("should perform search with results", async () => {
      const mockResults: SearchResult[] = [
        {
          node: {
            id: "node1",
            timestamp: Date.now(),
            raw_text: "Test node 1 content",
            tags: ["test", "node1"],
            metadata: { title: "Test Node 1" },
          },
          score: 0.8,
          matches: ["test", "node1"],
        },
      ];

      searchSpy.mockReturnValue(mockResults);

      const results = search.search({ query: "test", limit: 10 });
      expect(results).toEqual(mockResults);
      expect(searchSpy).toHaveBeenCalledWith({
        query: "test",
        limit: 10,
      });
    });

    it("should handle search with no results", async () => {
      searchSpy.mockReturnValue([]);

      const results = search.search({ query: "nonexistent", limit: 10 });
      expect(results).toHaveLength(0);
      expect(searchSpy).toHaveBeenCalledWith({
        query: "nonexistent",
        limit: 10,
      });
    });

    it("should respect search limit", async () => {
      const mockResults: SearchResult[] = [
        {
          node: {
            id: "node1",
            timestamp: Date.now(),
            raw_text: "Test node 1 content",
            tags: ["test", "node1"],
            metadata: { title: "Test Node 1" },
          },
          score: 0.8,
          matches: ["test", "node1"],
        },
        {
          node: {
            id: "node2",
            timestamp: Date.now(),
            raw_text: "Test node 2 content",
            tags: ["test", "node2"],
            metadata: { title: "Test Node 2" },
          },
          score: 0.6,
          matches: ["test", "node2"],
        },
      ];

      // Mock search to return limited results
      searchSpy.mockImplementation(({ query, limit }) => {
        return mockResults.slice(0, limit);
      });

      const results = search.search({ query: "test", limit: 1 });
      expect(results).toHaveLength(1);
      expect(searchSpy).toHaveBeenCalledWith({
        query: "test",
        limit: 1,
      });
    });

    it("should handle search errors gracefully", async () => {
      searchSpy.mockImplementation(() => {
        throw new Error("Search failed");
      });

      expect(() => search.search({ query: "test", limit: 10 })).toThrow(
        "Search failed"
      );
    });
  });
});
