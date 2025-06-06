import { z } from "zod";

/**
 * Base configuration for AI models
 */
export interface ModelConfig {
  /** Model name or identifier */
  model: string;
  /** Maximum number of tokens in the response */
  maxTokens?: number;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Additional model-specific configuration */
  [key: string]: unknown;
}

/**
 * Response from an AI model
 */
export interface ModelResponse {
  /** Generated text content */
  content: string;
  /** Number of tokens used */
  tokensUsed: number;
  /** Model-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Error types for AI model operations
 */
export class ModelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ModelError";
  }
}

/**
 * Base interface for AI models
 */
export interface AIModel {
  /**
   * Initialize the model with configuration
   */
  initialize(config: ModelConfig): Promise<void>;

  /**
   * Generate a response for the given prompt
   */
  generate(prompt: string): Promise<ModelResponse>;

  /**
   * Check if the model is ready to use
   */
  isReady(): boolean;

  /**
   * Get the current model configuration
   */
  getConfig(): ModelConfig;
}

/**
 * Zod schema for model configuration validation
 */
export const modelConfigSchema = z
  .object({
    model: z.string(),
    maxTokens: z.number().optional(),
    temperature: z.number().min(0).max(1).optional(),
  })
  .passthrough();

/**
 * Zod schema for model response validation
 */
export const modelResponseSchema = z.object({
  content: z.string(),
  tokensUsed: z.number(),
  metadata: z.record(z.unknown()).optional(),
});
