import { beforeEach, describe, expect, it } from "vitest";

import { Node } from "./types";
import { NodeSearch } from "./search";

describe("NodeSearch", () => {
  const testNodes: Node[] = [
    {
      id: "1",
      timestamp: Date.now(),
      raw_text: "UHMW plastic cutting board material",
      tags: ["UHMW", "plastic", "cutting board"],
    },
    {
      id: "2",
      timestamp: Date.now(),
      raw_text: "Python programming language tutorial",
      tags: ["python", "programming", "tutorial"],
    },
    {
      id: "3",
      timestamp: Date.now(),
      raw_text: "How to make a wooden table",
      tags: ["woodworking", "furniture", "table"],
    },
  ];

  let search: NodeSearch;

  beforeEach(() => {
    search = new NodeSearch();
    search.addNodes(testNodes);
  });

  it("should find nodes by text content", () => {
    const results = search.search({ query: "cutting board" });
    expect(results).toHaveLength(1);
    expect(results[0].node.raw_text).toBe(
      "UHMW plastic cutting board material"
    );
  });

  it("should find nodes by tags", () => {
    const results = search.search({ query: "python" });
    expect(results).toHaveLength(1);
    expect(results[0].node.tags).toContain("python");
  });

  it("should prioritize tag matches", () => {
    const results = search.search({ query: "table" });
    expect(results).toHaveLength(1);
    expect(results[0].node.tags).toContain("table");
  });

  it("should support fuzzy matching", () => {
    const results = search.search({ query: "pithon" });
    expect(results).toHaveLength(1);
    expect(results[0].node.tags).toContain("python");
  });

  it("should limit results", () => {
    const results = search.search({ query: "to", limit: 2 });
    expect(results).toHaveLength(1);
  });

  it("should return empty results when index is not loaded", () => {
    const emptySearch = new NodeSearch();
    const results = emptySearch.search({ query: "test" });
    expect(results).toHaveLength(0);
  });

  it("should update node in index", () => {
    const updatedNode: Node = {
      ...testNodes[0],
      raw_text: "Updated UHMW plastic material",
    };

    search.updateNode(updatedNode);
    const results = search.search({ query: "Updated" });
    expect(results).toHaveLength(1);
    expect(results[0].node.raw_text).toBe("Updated UHMW plastic material");
  });

  it("should remove node from index", () => {
    search.removeNode("1");
    const results = search.search({ query: "UHMW" });
    expect(results).toHaveLength(0);
  });
});
