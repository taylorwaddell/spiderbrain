/**
 * Represents a single node in the Spider Brain system
 */
export interface Node {
  /** Unique identifier for the node */
  id: string;
  /** Unix timestamp of when the node was created */
  timestamp: number;
  /** The raw text content of the node */
  raw_text: string;
  /** Array of tags associated with the node */
  tags: string[];
  /** Optional metadata for future extensibility */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a search operation
 */
export interface SearchResult {
  /** The matching node */
  node: Node;
  /** Relevance score (0-1) */
  score: number;
  /** Array of matched terms */
  matches: string[];
}

/**
 * Options for creating a new node
 */
export interface CreateNodeOptions {
  /** The raw text content */
  raw_text: string;
  /** Optional initial tags */
  tags?: string[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for searching nodes
 */
export interface SearchOptions {
  /** The search query */
  query: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Whether to include fuzzy matching */
  fuzzy?: boolean;
  /** Minimum relevance score (0-1) */
  minScore?: number;
}

/**
 * Error thrown when a node is not found
 */
export class NodeNotFoundError extends Error {
  constructor(id: string) {
    super(`Node with id ${id} not found`);
    this.name = "NodeNotFoundError";
  }
}

/**
 * Error thrown when there's an issue with the storage
 */
export class StorageError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "StorageError";
    if (cause) this.cause = cause;
  }
}
