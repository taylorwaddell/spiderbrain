import { AIModel } from "../models/base.js";

/**
 * Tag format options
 */
export type TagFormat = "hashtag" | "plain" | "custom";

/**
 * Tag generation configuration
 */
export interface TagConfig {
  /** Format of the generated tags */
  format: TagFormat;
  /** Custom format string (used when format is 'custom') */
  customFormat?: string;
  /** Maximum number of tags to generate */
  maxTags?: number;
  /** Minimum relevance score (0-1) */
  minRelevance?: number;
  /** Whether to deduplicate tags */
  deduplicate?: boolean;
  /** Custom validation rules */
  validationRules?: TagValidationRule[];
}

/**
 * Tag validation rule
 */
export interface TagValidationRule {
  /** Rule name for identification */
  name: string;
  /** Function to validate a tag */
  validate: (tag: string) => boolean;
  /** Error message if validation fails */
  errorMessage: string;
}

/**
 * Generated tag with metadata
 */
export interface Tag {
  /** The tag text */
  text: string;
  /** Relevance score (0-1) */
  relevance: number;
  /** Category of the tag */
  category?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tag generation result
 */
export interface TagResult {
  /** Generated tags */
  tags: Tag[];
  /** Generation metadata */
  metadata: {
    /** Total generation time in milliseconds */
    generationTime: number;
    /** Number of tags before filtering */
    totalTags: number;
    /** Number of tags after filtering */
    filteredTags: number;
    /** Model used for generation */
    model: string;
  };
}

/**
 * Tag generation options
 */
export interface TagOptions {
  /** Content to generate tags for */
  content: string;
  /** Content type (e.g., 'code', 'documentation', 'text') */
  contentType?: string;
  /** Custom configuration */
  config?: Partial<TagConfig>;
  /** Model to use for generation */
  model?: AIModel;
}

/**
 * Tag generation error
 */
export class TagError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "TagError";
  }
}
