import { CreateNodeOptions, Node } from "./types";

import { AIService } from "../ai/services/ai.js";
import { NodeStorage } from "./storage";

/**
 * Manages the creation and retrieval of nodes
 */
export class NodeManager {
  private storage: NodeStorage;
  private aiService: AIService;

  constructor(dataPath: string, aiService: AIService) {
    this.storage = new NodeStorage(dataPath, aiService);
    this.aiService = aiService;
  }

  /**
   * Initialize the node manager
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.storage.load();
  }

  /**
   * Create a new node
   */
  async createNode(options: CreateNodeOptions): Promise<Node> {
    return this.storage.create(options);
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<Node> {
    return this.storage.get(id);
  }

  /**
   * Update a node
   */
  async updateNode(id: string, updates: Partial<Node>): Promise<Node> {
    return this.storage.update(id, updates);
  }

  /**
   * Delete a node
   */
  async deleteNode(id: string): Promise<void> {
    return this.storage.delete(id);
  }

  /**
   * List all nodes
   */
  async listNodes(): Promise<Node[]> {
    return this.storage.list();
  }

  /**
   * Get the total number of nodes
   */
  async getNodeCount(): Promise<number> {
    return this.storage.count();
  }

  /**
   * Update tag generation configuration
   */
  updateTagConfig(config: Parameters<NodeStorage["updateTagConfig"]>[0]): void {
    this.storage.updateTagConfig(config);
  }
}
