import { AIModel, ModelConfig, ModelError, ModelResponse } from "./base.js";
import { RetryOptions, defaultRetryOptions, retry } from "../utils/retry.js";

import { Ollama } from "ollama";
import { z } from "zod";

/**
 * Ollama-specific configuration
 */
export interface OllamaConfig extends ModelConfig {
  /** Base URL for Ollama API */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Model name to use */
  model: string;
  /** System prompt to use */
  systemPrompt?: string;
  /** Context window size */
  contextWindow?: number;
  /** Number of tokens to generate */
  numPredict?: number;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** Top P for nucleus sampling */
  topP?: number;
  /** Top K for top-k sampling */
  topK?: number;
  /** Stop sequences */
  stop?: string[];
  /** Retry configuration */
  retry?: RetryOptions;
}

/**
 * Ollama request options
 */
export interface OllamaRequestOptions {
  /** Model name */
  model: string;
  /** Prompt to generate from */
  prompt: string;
  /** System prompt */
  system?: string;
  /** Context for the next request */
  context?: number[];
  /** Number of tokens to generate */
  num_predict?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Top P for nucleus sampling */
  top_p?: number;
  /** Top K for top-k sampling */
  top_k?: number;
  /** Stop sequences */
  stop?: string[];
}

/**
 * Ollama response
 */
export interface OllamaResponse {
  /** Generated text */
  response: string;
  /** Whether the response is complete */
  done: boolean;
  /** Context for the next request */
  context?: number[];
  /** Total duration in nanoseconds */
  total_duration?: number;
  /** Load duration in nanoseconds */
  load_duration?: number;
  /** Prompt evaluation duration in nanoseconds */
  prompt_eval_duration?: number;
  /** Evaluation duration in nanoseconds */
  eval_duration?: number;
  /** Evaluation count */
  eval_count?: number;
}

/**
 * Zod schema for Ollama configuration validation
 */
export const ollamaConfigSchema = z
  .object({
    baseUrl: z.string().url().optional(),
    model: z.string(),
    apiKey: z.string().optional(),
    systemPrompt: z.string().optional(),
    contextWindow: z.number().positive().optional(),
    numPredict: z.number().positive().optional(),
    temperature: z.number().min(0).max(1).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().positive().optional(),
    stop: z.array(z.string()).optional(),
    retry: z
      .object({
        maxAttempts: z.number().positive(),
        initialDelay: z.number().positive(),
        maxDelay: z.number().positive(),
        factor: z.number().positive(),
      })
      .optional(),
  })
  .passthrough();

/**
 * Implementation of AIModel for Ollama
 */
export class OllamaModel implements AIModel {
  private client: Ollama;
  private config: OllamaConfig;
  private ready: boolean = false;
  private retryConfig: RetryOptions;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.client = new Ollama({
      host: config.baseUrl || "http://localhost:11434",
      headers: config.apiKey
        ? { Authorization: `Bearer ${config.apiKey}` }
        : undefined,
    });
    this.retryConfig = { ...defaultRetryOptions, ...config.retry };
  }

  /**
   * Initialize the model
   */
  async initialize(config: OllamaConfig): Promise<void> {
    try {
      // Validate configuration
      ollamaConfigSchema.parse(config);
      this.config = config;
      this.retryConfig = { ...defaultRetryOptions, ...config.retry };

      // Update client configuration
      this.client = new Ollama({
        host: config.baseUrl || "http://localhost:11434",
        headers: config.apiKey
          ? { Authorization: `Bearer ${config.apiKey}` }
          : undefined,
      });

      // Check if model is available with retry logic
      await retry(async () => {
        const models = await this.client.list();
        // Check if model exists with or without version tag
        const modelExists = models.models.some((m) => {
          const modelName = m.name.split(":")[0]; // Remove version tag
          return modelName === config.model;
        });

        if (!modelExists) {
          const availableModels = models.models.map((m) => m.name).join(", ");
          throw new ModelError(
            `Model ${config.model} not found. Available models: ${availableModels}`,
            "MODEL_NOT_FOUND"
          );
        }
      }, this.retryConfig);

      this.ready = true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ModelError("Invalid configuration", "INVALID_CONFIG", error);
      }
      throw error;
    }
  }

  /**
   * Generate a response for the given prompt
   */
  async generate(prompt: string): Promise<ModelResponse> {
    if (!this.ready) {
      throw new ModelError("Model not initialized", "NOT_INITIALIZED");
    }

    try {
      const response = await retry(
        async () =>
          this.client.generate({
            model: this.config.model,
            prompt,
            options: {
              temperature: this.config.temperature,
              num_predict: this.config.numPredict,
            },
          }),
        this.retryConfig
      );

      return {
        content: response.response,
        tokensUsed: response.eval_count || 0,
        metadata: {
          totalDuration: response.total_duration || 0,
          loadDuration: response.load_duration || 0,
          promptEvalDuration: response.prompt_eval_duration || 0,
          evalDuration: response.eval_duration || 0,
        },
      };
    } catch (error) {
      throw new ModelError(
        `Failed to generate response: ${
          error instanceof Error ? error.message : error
        }`,
        "GENERATION_FAILED",
        error as Error
      );
    }
  }

  /**
   * Check if the model is ready to use
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Get the current model configuration
   */
  getConfig(): ModelConfig {
    return this.config;
  }
}
