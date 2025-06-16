import {
  CreateNodeOptions,
  Node,
  NodeNotFoundError,
  StorageError,
} from "./types.js";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { dirname, join, resolve } from "path";

import { AIService } from "../ai/services/ai.js";
import { ConfigManager } from "./config.js";
import { TagService } from "./tags/service.js";
import { createInterface } from "readline";
import { randomUUID } from "crypto";

/**
 * Error thrown when path validation fails
 */
export class PathValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(message);
    this.name = "PathValidationError";
  }
}

/**
 * Manages the storage of nodes in JSONL format
 */
export class NodeStorage {
  private readonly configManager: ConfigManager;
  private nodes: Map<string, Node> = new Map();
  private tagService: TagService | null;
  private isTestMode: boolean;

  constructor(configManager: ConfigManager, aiService?: AIService) {
    this.configManager = configManager;
    this.isTestMode = !aiService;
    this.tagService = aiService ? new TagService(aiService) : null;
  }

  /**
   * Get the current data path
   */
  private getDataPath(): string {
    const basePath = this.configManager.getDataDir();
    return resolve(join(basePath, "nodes.jsonl"));
  }

  /**
   * Validate a path for storage operations
   */
  private async validatePath(path: string): Promise<void> {
    try {
      // Ensure parent directory exists
      const parentDir = dirname(path);
      await fs.mkdir(parentDir, { recursive: true });

      // Check if directory is writable
      await fs.access(parentDir, fs.constants.W_OK);

      // If file exists, check if it's writable
      try {
        await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        // File doesn't exist, that's okay
      }
    } catch (error) {
      throw new PathValidationError(
        `Path validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        path
      );
    }
  }

  /**
   * Initialize the storage by creating the data file if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      const dataPath = this.getDataPath();
      await this.validatePath(dataPath);

      try {
        await fs.access(dataPath);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(dataPath, "", "utf-8");
      }
    } catch (error) {
      if (error instanceof PathValidationError) {
        throw error;
      }
      throw new StorageError("Failed to initialize storage", error as Error);
    }
  }

  /**
   * Load all nodes from the JSONL file
   */
  async load(): Promise<void> {
    try {
      const dataPath = this.getDataPath();
      await this.validatePath(dataPath);

      const fileStream = createReadStream(dataPath, "utf-8");
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
      if (error instanceof PathValidationError) {
        throw error;
      }
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
      const dataPath = this.getDataPath();
      await this.validatePath(dataPath);

      // Generate tags if none provided and not in test mode
      if ((!options.tags || options.tags.length === 0) && !this.isTestMode) {
        node.tags = await this.tagService!.generateTags(node);
      }

      // Append to file
      await fs.appendFile(dataPath, JSON.stringify(node) + "\n", "utf-8");

      // Update in-memory cache
      this.nodes.set(node.id, node);
      return node;
    } catch (error) {
      if (error instanceof PathValidationError) {
        throw error;
      }
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
      const dataPath = this.getDataPath();
      await this.validatePath(dataPath);

      // Regenerate tags if content changed and not in test mode
      if (updates.raw_text && !this.isTestMode) {
        updatedNode.tags = await this.tagService!.generateTags(updatedNode);
      }

      // Rewrite the entire file with the updated node
      const nodes = Array.from(this.nodes.values());
      const nodeIndex = nodes.findIndex((n) => n.id === id);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = updatedNode;
      }

      await fs.writeFile(
        dataPath,
        nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
        "utf-8"
      );

      // Update in-memory cache
      this.nodes.set(id, updatedNode);
      return updatedNode;
    } catch (error) {
      if (error instanceof PathValidationError) {
        throw error;
      }
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
      const dataPath = this.getDataPath();
      await this.validatePath(dataPath);

      // Rewrite the file without the deleted node
      const nodes = Array.from(this.nodes.values()).filter((n) => n.id !== id);

      await fs.writeFile(
        dataPath,
        nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
        "utf-8"
      );

      // Update in-memory cache
      this.nodes.delete(id);
    } catch (error) {
      if (error instanceof PathValidationError) {
        throw error;
      }
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

  /**
   * Update tag service configuration
   */
  updateTagConfig(config: Parameters<TagService["updateConfig"]>[0]): void {
    if (!this.isTestMode) {
      this.tagService!.updateConfig(config);
    }
  }

  /**
   * Migrate data to a new path
   */
  async migrateData(newPath: string): Promise<void> {
    try {
      const newDataPath = resolve(join(newPath, "nodes.jsonl"));
      await this.validatePath(newDataPath);

      // Copy all nodes to new location
      const nodes = Array.from(this.nodes.values());
      await fs.writeFile(
        newDataPath,
        nodes.map((n) => JSON.stringify(n)).join("\n") + "\n",
        "utf-8"
      );

      // Update configuration
      await this.configManager.setDataDir(newPath);
    } catch (error) {
      if (error instanceof PathValidationError) {
        throw error;
      }
      throw new StorageError("Failed to migrate data", error as Error);
    }
  }
}
