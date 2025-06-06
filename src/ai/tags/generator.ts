import {
  Tag,
  TagConfig,
  TagError,
  TagFormat,
  TagOptions,
  TagResult,
  TagValidationRule,
} from "./types.js";

import { AIModel } from "../models/base.js";
import { AIService } from "../services/ai.js";

/**
 * Default tag configuration
 */
const DEFAULT_CONFIG: TagConfig = {
  format: "hashtag",
  maxTags: 5,
  minRelevance: 0.5,
  deduplicate: true,
};

/**
 * Default validation rules
 */
const DEFAULT_VALIDATION_RULES: TagValidationRule[] = [
  {
    name: "length",
    validate: (tag: string) => tag.length >= 2 && tag.length <= 50,
    errorMessage: "Tag length must be between 2 and 50 characters",
  },
  {
    name: "format",
    validate: (tag: string) => /^[a-zA-Z0-9-_]+$/.test(tag),
    errorMessage:
      "Tag can only contain letters, numbers, hyphens, and underscores",
  },
];

/**
 * Tag generator for creating tags from content
 */
export class TagGenerator {
  private config: TagConfig;
  private aiService: AIService;
  private logger: Console;

  constructor(aiService: AIService, config: Partial<TagConfig> = {}) {
    this.aiService = aiService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = console;
  }

  /**
   * Generate tags for the given content
   */
  async generateTags(options: TagOptions): Promise<TagResult> {
    const startTime = Date.now();
    const model = options.model || this.aiService.getModel();
    const config = { ...this.config, ...options.config };

    try {
      // Generate tags using AI model
      const response = await this.generateTagsWithModel(model, options);

      // Process and validate tags
      const tags = await this.processTags(response, config);

      // Format tags
      const formattedTags = this.formatTags(tags, config);

      // Filter tags
      const filteredTags = this.filterTags(formattedTags, config);

      return {
        tags: filteredTags,
        metadata: {
          generationTime: Date.now() - startTime,
          totalTags: tags.length,
          filteredTags: filteredTags.length,
          model: model.getConfig().model,
        },
      };
    } catch (error) {
      throw new TagError("Failed to generate tags", "GENERATION_ERROR", error);
    }
  }

  /**
   * Generate tags using the AI model
   */
  private async generateTagsWithModel(
    model: AIModel,
    options: TagOptions
  ): Promise<string[]> {
    const prompt = this.buildPrompt(options);
    const response = await model.generate(prompt);
    return this.extractTags(response.content);
  }

  /**
   * Build the prompt for tag generation
   */
  private buildPrompt(options: TagOptions): string {
    const contentType = options.contentType || "text";
    return `Generate relevant tags for the following ${contentType}:\n\n${options.content}\n\nTags:`;
  }

  /**
   * Extract tags from the model response
   */
  private extractTags(response: string): string[] {
    return response
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  /**
   * Process and validate tags
   */
  private async processTags(tags: string[], config: TagConfig): Promise<Tag[]> {
    const validationRules = [
      ...DEFAULT_VALIDATION_RULES,
      ...(config.validationRules || []),
    ];

    return tags.map((tag) => {
      // Validate tag
      for (const rule of validationRules) {
        if (!rule.validate(tag)) {
          throw new TagError(rule.errorMessage, "VALIDATION_ERROR", {
            tag,
            rule: rule.name,
          });
        }
      }

      return {
        text: tag,
        relevance: 1.0, // TODO: Implement relevance scoring
        category: undefined, // TODO: Implement categorization
      };
    });
  }

  /**
   * Format tags according to configuration
   */
  private formatTags(tags: Tag[], config: TagConfig): Tag[] {
    return tags.map((tag) => ({
      ...tag,
      text: this.formatTag(tag.text, config),
    }));
  }

  /**
   * Format a single tag
   */
  private formatTag(tag: string, config: TagConfig): string {
    switch (config.format) {
      case "hashtag":
        return `#${tag}`;
      case "plain":
        return tag;
      case "custom":
        if (!config.customFormat) {
          throw new TagError(
            "Custom format string is required for 'custom' format",
            "CONFIG_ERROR"
          );
        }
        return config.customFormat.replace("{tag}", tag);
      default:
        throw new TagError(
          `Unsupported tag format: ${config.format}`,
          "CONFIG_ERROR"
        );
    }
  }

  /**
   * Filter tags based on configuration
   */
  private filterTags(tags: Tag[], config: TagConfig): Tag[] {
    let filtered = tags;

    // Filter by relevance
    if (config.minRelevance) {
      filtered = filtered.filter(
        (tag) => tag.relevance >= config.minRelevance!
      );
    }

    // Filter by max tags
    if (config.maxTags) {
      filtered = filtered.slice(0, config.maxTags);
    }

    // Deduplicate
    if (config.deduplicate) {
      const seen = new Set<string>();
      filtered = filtered.filter((tag) => {
        if (seen.has(tag.text)) {
          return false;
        }
        seen.add(tag.text);
        return true;
      });
    }

    return filtered;
  }

  /**
   * Update the generator configuration
   */
  updateConfig(config: Partial<TagConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration
   */
  getConfig(): TagConfig {
    return { ...this.config };
  }
}
