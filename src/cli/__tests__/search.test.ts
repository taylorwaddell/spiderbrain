import type { Node, SearchOptions, SearchResult } from "../../core/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NodeSearch } from "../../core/search.js";
import { NodeStorage } from "../../core/storage.js";
import { searchCommand } from "../commands/search.js";

// Mock dependencies
vi.mock("../../core/storage.js", () => ({
  NodeStorage: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock("../../core/search.js", () => ({
  NodeSearch: vi.fn().mockImplementation(() => ({
    isIndexLoaded: vi.fn().mockReturnValue(false),
    addNodes: vi.fn(),
    search: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock("fs", () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("ora", () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
}));

describe("search command", () => {
  let mockStorage: {
    initialize: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
  };
  let mockSearch: {
    isIndexLoaded: ReturnType<typeof vi.fn>;
    addNodes: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {
      initialize: vi.fn(),
      load: vi.fn(),
      list: vi.fn(),
    };

    mockSearch = {
      isIndexLoaded: vi.fn(),
      addNodes: vi.fn(),
      search: vi.fn(),
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should handle successful search with results", async () => {
    const mockNodes: Node[] = [
      {
        id: "1",
        timestamp: Date.now(),
        raw_text: "test content",
        metadata: { title: "Test Node" },
        tags: ["test"],
      },
    ];

    mockStorage.list.mockResolvedValue(mockNodes);
    mockSearch.isIndexLoaded.mockReturnValue(false);
    mockSearch.search.mockReturnValue([
      {
        node: mockNodes[0],
        score: 0.8,
        matches: ["test"],
      },
    ]);

    await searchCommand(
      "test",
      {},
      mockStorage as unknown as NodeStorage,
      mockSearch as unknown as NodeSearch
    );

    expect(mockStorage.initialize).toHaveBeenCalled();
    expect(mockStorage.load).toHaveBeenCalled();
    expect(mockSearch.addNodes).toHaveBeenCalledWith(mockNodes);
    expect(mockSearch.search).toHaveBeenCalledWith({
      query: "test",
      limit: 10,
    });
  });

  it("should handle search with no results", async () => {
    mockStorage.list.mockResolvedValue([]);
    mockSearch.isIndexLoaded.mockReturnValue(false);
    mockSearch.search.mockReturnValue([]);

    await searchCommand(
      "nonexistent",
      {},
      mockStorage as unknown as NodeStorage,
      mockSearch as unknown as NodeSearch
    );

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No results found")
    );
  });

  it("should handle empty query", async () => {
    mockStorage.list.mockResolvedValue([]);
    mockSearch.isIndexLoaded.mockReturnValue(false);
    mockSearch.search.mockReturnValue([]);

    await searchCommand(
      "",
      {},
      mockStorage as unknown as NodeStorage,
      mockSearch as unknown as NodeSearch
    );

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No results found")
    );
  });

  it("should handle invalid limit value", async () => {
    const mockNodes: Node[] = [
      {
        id: "1",
        timestamp: Date.now(),
        raw_text: "test content",
        metadata: { title: "Test Node" },
        tags: ["test"],
      },
    ];

    mockStorage.list.mockResolvedValue(mockNodes);
    mockSearch.isIndexLoaded.mockReturnValue(false);
    mockSearch.search.mockReturnValue([
      {
        node: mockNodes[0],
        score: 0.8,
        matches: ["test"],
      },
    ]);

    await searchCommand(
      "test",
      { limit: "invalid" },
      mockStorage as unknown as NodeStorage,
      mockSearch as unknown as NodeSearch
    );

    expect(mockSearch.search).toHaveBeenCalledWith({
      query: "test",
      limit: 10,
    });
  });

  it("should handle storage initialization error", async () => {
    mockStorage.initialize.mockRejectedValue(new Error("Storage error"));

    await expect(
      searchCommand(
        "test",
        {},
        mockStorage as unknown as NodeStorage,
        mockSearch as unknown as NodeSearch
      )
    ).rejects.toThrow("Storage error");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Storage error")
    );
  });

  it("should handle search index error", async () => {
    mockStorage.list.mockResolvedValue([]);
    mockSearch.isIndexLoaded.mockReturnValue(false);
    mockSearch.search.mockImplementation(() => {
      throw new Error("Search error");
    });

    await expect(
      searchCommand(
        "test",
        {},
        mockStorage as unknown as NodeStorage,
        mockSearch as unknown as NodeSearch
      )
    ).rejects.toThrow("Search error");
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Search error")
    );
  });
});
