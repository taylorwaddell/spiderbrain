import {
  CreateNodeOptions,
  Node,
  NodeNotFoundError,
  StorageError,
} from "./types";
import { createReadStream, createWriteStream, promises as fs } from "fs";

import { createInterface } from "readline";
import { randomUUID } from "crypto";

/**
 * Manages the storage of nodes in JSONL format
 */
export class NodeStorage {
  private readonly dataPath: string;
  private nodes: Map<string, Node> = new Map();

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  /**
   * Initialize the storage by creating the data file if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      await fs.access(this.dataPath);
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(this.dataPath, "", "utf-8");
    }
  }

  /**
   * Load all nodes from the JSONL file
   */
  async load(): Promise<void> {
    try {
      const fileStream = createReadStream(this.dataPath, "utf-8");
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        if (line.trim()) {
          const node = JSON.parse(line) as Node;
          this.nodes.set(node.id, node);
        }
      }
    } catch (error) {
      throw new StorageError("Failed to load nodes", error as Error);
    }
  }

  /**
   * Create a new node
   */
  async create(options: CreateNodeOptions): Promise<Node> {
    const node: Node = {
      id: randomUUID(),
      timestamp: Date.now(),
      raw_text: options.raw_text,
      tags: options.tags || [],
      metadata: options.metadata,
    };

    try {
      // Append to file
      await fs.appendFile(this.dataPath, JSON.stringify(node) + "\n", "utf-8");

      // Update in-memory cache
      this.nodes.set(node.id, node);
      return node;
    } catch (error) {
      throw new StorageError("Failed to create node", error as Error);
    }
  }

  /**
   * Get a node by ID
   */
  async get(id: string): Promise<Node> {
    const node = this.nodes.get(id);
    if (!node) {
      throw new NodeNotFoundError(id);
    }
    return node;
  }

  /**
   * Update an existing node
   */
  async update(id: string, updates: Partial<Node>): Promise<Node> {
    const node = await this.get(id);
    const updatedNode = { ...node, ...updates };

    try {
      // Rewrite the entire file with the updated node
      const nodes = Array.from(this.nodes.values());
      const nodeIndex = nodes.findIndex((n) => n.id === id);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = updatedNode;
      }

      await fs.writeFile(
        this.dataPath,
        nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
        "utf-8"
      );

      // Update in-memory cache
      this.nodes.set(id, updatedNode);
      return updatedNode;
    } catch (error) {
      throw new StorageError("Failed to update node", error as Error);
    }
  }

  /**
   * Delete a node
   */
  async delete(id: string): Promise<void> {
    if (!this.nodes.has(id)) {
      throw new NodeNotFoundError(id);
    }

    try {
      // Rewrite the file without the deleted node
      const nodes = Array.from(this.nodes.values()).filter((n) => n.id !== id);

      await fs.writeFile(
        this.dataPath,
        nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
        "utf-8"
      );

      // Update in-memory cache
      this.nodes.delete(id);
    } catch (error) {
      throw new StorageError("Failed to delete node", error as Error);
    }
  }

  /**
   * List all nodes
   */
  async list(): Promise<Node[]> {
    return Array.from(this.nodes.values());
  }

  /**
   * Get the total number of nodes
   */
  async count(): Promise<number> {
    return this.nodes.size;
  }
}
