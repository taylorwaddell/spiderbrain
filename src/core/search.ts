import { Node, SearchOptions, SearchResult } from "./types";

import MiniSearch from "minisearch";

/**
 * Manages the search functionality for nodes
 */
export class NodeSearch {
  private searchIndex: MiniSearch<Node>;
  private isLoaded: boolean = false;

  constructor() {
    this.searchIndex = new MiniSearch({
      fields: ["raw_text", "tags"],
      storeFields: ["id", "raw_text", "tags", "timestamp", "metadata"],
      searchOptions: {
        boost: { tags: 2 }, // Prioritize tag matches
        fuzzy: 0.2, // Allow for some typos
        prefix: true, // Match word prefixes
      },
    });
  }

  /**
   * Add nodes to the search index
   */
  addNodes(nodes: Node[]): void {
    this.searchIndex.addAll(nodes);
    this.isLoaded = true;
  }

  /**
   * Search for nodes matching the query
   */
  search(options: SearchOptions): SearchResult[] {
    if (!this.isLoaded) {
      return [];
    }

    const results = this.searchIndex.search(options.query, {
      fuzzy: options.fuzzy ?? true,
      prefix: true,
      filter: (result) => {
        if (options.minScore && result.score < options.minScore) {
          return false;
        }
        return true;
      },
    });

    return results
      .map((result) => ({
        node: result as unknown as Node,
        score: result.score,
        matches:
          result.matches?.map((match: { value: string }) => match.value) ?? [],
      }))
      .slice(0, options.limit ?? 10);
  }

  /**
   * Remove a node from the search index
   */
  removeNode(id: string): void {
    this.searchIndex.remove({ id } as Node);
  }

  /**
   * Update a node in the search index
   */
  updateNode(node: Node): void {
    this.searchIndex.remove({ id: node.id } as Node);
    this.searchIndex.add(node);
  }

  /**
   * Check if the search index is loaded
   */
  isIndexLoaded(): boolean {
    return this.isLoaded;
  }
}
