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
    console.log("Generating tags with options:", this.aiService); // AI service is undefined here
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
    const content = options.contentType || "text";
    // return `Generate between 3 and 10 single-word, lowercase tags (no punctuation) for the following memory entry. Tags should aid future search—even by surfacing loose connections—and you may include tags that aren’t literally in the text. Return ONLY a comma-separated list of tags, with no extra text.

    //   Memory Entry:
    //   "${content}"`;

    return `
    Example 1
Content: "iphone 13 is objectively the best phone"
Good Tags: iphone, smartphone, apple, mobile, review

Example 2
Content: "I found archived government maps at nationalarchives.gov"
Good Tags: maps, historical, government, archives, free, national

Now for the new content, generate 3–10 single-word, lowercase tags (no punctuation). Return ONLY a comma-separated list.

Content:
"${content}"`;

    // return `You’re a memory-tagging assistant. Generate 3–10 single-word, lowercase tags (no punctuation) that will help me later find or relate to this memory entry—even via loose connections. Return ONLY a comma-separated list of tags.

    // Content:
    // "${content}"`;
  }

  /**
   * Extract tags from the model response
   */
  private extractTags(response: string): string[] {
    // Split by newlines and commas, then clean up each potential tag
    console.log("🟨🟨🟨🟨 → response", response);
    const theRealDeal = response
      .split(/[,\n]/)
      .map((tag) => {
        // Remove any leading/trailing whitespace
        tag = tag.trim();
        // Remove any leading '#' or other special characters
        tag = tag.replace(/^[#@!?]+/, "");
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
    console.log("🟨🟨🟨🟨 → theRealDeal", theRealDeal);
    return theRealDeal;
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
