import { AIService } from "../../ai/services/ai.js";
import { Node } from "../types.js";
import { TagConfig } from "../../ai/tags/types.js";
import { TagGenerator } from "../../ai/tags/generator.js";

/**
 * Service for managing tag generation and updates
 */
export class TagService {
  private generator: TagGenerator;
  private config: TagConfig;

  constructor(aiService: AIService, config: Partial<TagConfig> = {}) {
    this.generator = new TagGenerator(aiService, config);
    this.config = this.generator.getConfig();
  }

  /**
   * Generate tags for a node
   */
  async generateTags(node: Node): Promise<string[]> {
    try {
      const result = await this.generator.generateTags({
        content: node.raw_text,
        contentType: this.getContentType(node),
      });

      return result.tags.map((tag) => tag.text);
    } catch (error) {
      console.error("Failed to generate tags:", error);
      return [];
    }
  }

  /**
   * Update tags for a node
   */
  async updateTags(node: Node): Promise<Node> {
    const tags = await this.generateTags(node);
    return {
      ...node,
      tags,
    };
  }

  /**
   * Determine content type based on node metadata
   */
  private getContentType(node: Node): string {
    const source = node.metadata?.source;
    if (typeof source === "string") {
      if (source.endsWith(".js") || source.endsWith(".ts")) {
        return "code";
      }
      if (source.endsWith(".md")) {
        return "documentation";
      }
    }
    return "text";
  }

  /**
   * Update the service configuration
   */
  updateConfig(config: Partial<TagConfig>): void {
    this.generator.updateConfig(config);
    this.config = this.generator.getConfig();
  }

  /**
   * Get the current configuration
   */
  getConfig(): TagConfig {
    return { ...this.config };
  }
}
