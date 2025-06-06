import { AIModel, ModelConfig, ModelError } from "../models/base.js";
import { OllamaConfig, OllamaModel } from "../models/ollama.js";

import { z } from "zod";

/**
 * Configuration for the AI Service
 */
export interface AIServiceConfig {
  /** Default model configuration */
  defaultModel: ModelConfig;
  /** Map of model configurations by name */
  models: Record<string, ModelConfig>;
  /** Whether to enable logging */
  enableLogging?: boolean;
  /** Whether to enable metrics */
  enableMetrics?: boolean;
}

/**
 * Zod schema for AI Service configuration validation
 */
export const aiServiceConfigSchema = z.object({
  defaultModel: z.object({
    model: z.string(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().positive().optional(),
  }),
  models: z.record(
    z.string(),
    z.object({
      model: z.string(),
      temperature: z.number().min(0).max(1).optional(),
      maxTokens: z.number().positive().optional(),
    })
  ),
  enableLogging: z.boolean().optional(),
  enableMetrics: z.boolean().optional(),
});

/**
 * AI Service for managing AI models and handling requests
 */
export class AIService {
  private models: Map<string, AIModel>;
  private config: AIServiceConfig;
  private defaultModel: AIModel;
  private logger: Console;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.models = new Map();
    this.logger = console;
    this.defaultModel = null as unknown as AIModel; // Will be properly initialized in initialize()
  }

  /**
   * Initialize the AI Service
   */
  async initialize(): Promise<void> {
    try {
      // Validate configuration
      aiServiceConfigSchema.parse(this.config);

      // Initialize default model
      this.defaultModel = await this.createModel(this.config.defaultModel);
      this.models.set("default", this.defaultModel);

      // Initialize other models
      for (const [name, modelConfig] of Object.entries(this.config.models)) {
        const model = await this.createModel(modelConfig);
        this.models.set(name, model);
      }

      if (this.config.enableLogging) {
        this.logger.log("AI Service initialized successfully");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new model instance based on configuration
   */
  private async createModel(config: ModelConfig): Promise<AIModel> {
    if (this.isOllamaConfig(config)) {
      const model = new OllamaModel(config);
      await model.initialize(config);
      return model;
    }
    throw new Error(`Unsupported model type: ${config.model}`);
  }

  /**
   * Type guard for Ollama configuration
   */
  private isOllamaConfig(config: ModelConfig): config is OllamaConfig {
    return "model" in config;
  }

  /**
   * Get a model by name
   */
  getModel(name: string = "default"): AIModel {
    const model = this.models.get(name);
    if (!model) {
      throw new Error(`Model not found: ${name}`);
    }
    return model;
  }

  /**
   * Get all available models
   */
  getModels(): Map<string, AIModel> {
    return this.models;
  }

  /**
   * Get the current configuration
   */
  getConfig(): AIServiceConfig {
    return this.config;
  }

  /**
   * Update the service configuration
   */
  async updateConfig(config: Partial<AIServiceConfig>): Promise<void> {
    const newConfig = { ...this.config, ...config };
    aiServiceConfigSchema.parse(newConfig);
    this.config = newConfig;

    // Update models if configuration changed
    if (config.defaultModel) {
      this.defaultModel = await this.createModel(config.defaultModel);
      this.models.set("default", this.defaultModel);
    }

    if (config.models) {
      for (const [name, modelConfig] of Object.entries(config.models)) {
        const model = await this.createModel(modelConfig);
        this.models.set(name, model);
      }
    }

    if (this.config.enableLogging) {
      this.logger.log("AI Service configuration updated");
    }
  }
}
