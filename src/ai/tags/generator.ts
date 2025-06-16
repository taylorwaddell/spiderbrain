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
  private aiService: AIService | null;
  private logger: Console;
  private initialized: boolean;
  private isTestMode: boolean;

  constructor(aiService: AIService | null, config: Partial<TagConfig> = {}) {
    this.aiService = aiService;
    this.isTestMode = !aiService;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = console;
    this.initialized = false;
  }

  /**
   * Get the current configuration
   */
  getConfig(): TagConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<TagConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Initialize the tag generator
   */
  async initialize(): Promise<void> {
    try {
      if (!this.initialized) {
        // In test mode, we don't need to check AI service
        if (!this.isTestMode) {
          if (!this.aiService) {
            throw new TagError(
              "AI service is required for tag generation",
              "INITIALIZATION_ERROR"
            );
          }
          // Ensure AI service is initialized
          if (!this.aiService.getModel()) {
            throw new TagError(
              "AI service must be initialized before using tag generator",
              "INITIALIZATION_ERROR"
            );
          }
        }
        this.initialized = true;
        this.logger.log("Tag generator initialized successfully");
      }
    } catch (error) {
      throw new TagError(
        "Failed to initialize tag generator",
        "INITIALIZATION_ERROR",
        error
      );
    }
  }

  /**
   * Generate tags for the given content
   */
  async generateTags(options: TagOptions): Promise<TagResult> {
    const startTime = Date.now();

    try {
      // Ensure generator is initialized
      if (!this.initialized) {
        await this.initialize();
      }

      // In test mode, return empty tags
      if (this.isTestMode) {
        return {
          tags: [],
          metadata: {
            generationTime: Date.now() - startTime,
            totalTags: 0,
            filteredTags: 0,
            model: "test",
          },
        };
      }

      // Get model from options or default
      let model: AIModel;
      try {
        model = options.model || this.aiService!.getModel();
      } catch (error) {
        throw new TagError("Failed to get AI model", "MODEL_ERROR", error);
      }

      const config = { ...this.config, ...options.config };

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
      if (error instanceof TagError) {
        throw error;
      }
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
    const content = options.content || "";
    return `You are a tagging assistant. Given content, generate 3-10 single-word lowercase tags related to ONLY the content provided. Return ONLY the tags separated by commas, nothing else.

Examples:
Content: "iPhone 13 review" → iphone, phone, review, apple, mobile
Content: "pizza recipe" → pizza, recipe, cooking, food, italian

User Content:
"${content}"`;
  }

  /**
   * Extract tags from the model response
   */
  private extractTags(response: string): string[] {
    // Split by commas and clean up each potential tag
    return response
      .split(",")
      .map((tag) => {
        // Remove any leading/trailing whitespace
        tag = tag.trim();
        // Remove any leading '#' or other special characters
        tag = tag.replace(/^[#@!$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/, "");
        // Remove any descriptive text (sentences)
        if (tag.includes(":")) {
          tag = tag.split(":").pop() || "";
        }
        return tag.trim();
      })
      .filter((tag) => {
        // Filter out empty tags, sentences, and descriptive text
        return (
          tag.length > 0 &&
          tag.length <= 50 &&
          !tag.includes(" ") &&
          !tag.toLowerCase().includes("tag") &&
          !tag.toLowerCase().includes("example") &&
          !tag.toLowerCase().includes("content")
        );
      });
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
          throw new TagError(
            `Tag validation failed: ${rule.errorMessage}`,
            "VALIDATION_ERROR",
            {
              tag,
              rule: rule.name,
            }
          );
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
    const format = config.format || this.config.format;
    switch (format) {
      case "hashtag":
        return `#${tag}`;
      case "plain":
        return tag;
      case "custom":
        if (!config.customFormat) {
          throw new TagError(
            "Custom format is required for custom tag format",
            "FORMAT_ERROR"
          );
        }
        return config.customFormat.replace("{tag}", tag);
      default:
        throw new TagError(`Invalid tag format: ${format}`, "FORMAT_ERROR");
    }
  }

  /**
   * Filter tags according to configuration
   */
  private filterTags(tags: Tag[], config: TagConfig): Tag[] {
    let filteredTags = [...tags];

    // Apply max tags limit
    if (config.maxTags && filteredTags.length > config.maxTags) {
      filteredTags = filteredTags.slice(0, config.maxTags);
    }

    // Apply relevance filter
    if (config.minRelevance) {
      filteredTags = filteredTags.filter(
        (tag) => tag.relevance >= config.minRelevance!
      );
    }

    // Apply deduplication
    if (config.deduplicate) {
      const seen = new Set<string>();
      filteredTags = filteredTags.filter((tag) => {
        const normalized = tag.text.toLowerCase();
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });
    }

    return filteredTags;
  }
}
