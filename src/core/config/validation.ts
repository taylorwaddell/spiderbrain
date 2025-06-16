import {
  OllamaNotAvailableError,
  OllamaService,
} from "../../ai/services/ollama.js";

import { Config } from "../config.js";
import { dirname } from "path";
import { promises as fs } from "fs";

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validate a data directory path
 */
export async function validateDataDir(path: string): Promise<void> {
  try {
    // Ensure parent directory exists
    const parentDir = dirname(path);
    await fs.mkdir(parentDir, { recursive: true });

    // Check if directory is writable
    await fs.access(parentDir, fs.constants.W_OK);
  } catch (error) {
    throw new ConfigValidationError(
      `Invalid data directory: ${
        error instanceof Error ? error.message : String(error)
      }`,
      "dataDir"
    );
  }
}

/**
 * Validate a model name
 */
export async function validateModel(
  model: string,
  ollamaService?: OllamaService
): Promise<void> {
  function fallback(): void {
    const validModels = ["phi4-mini"]; // Default fallback list
    if (!validModels.includes(model)) {
      throw new ConfigValidationError(
        `Invalid model: ${model}. Valid models are: ${validModels.join(", ")}`,
        "model"
      );
    }
    return;
  }

  // If no Ollama service is provided, use a basic validation
  if (!ollamaService) {
    return fallback();
  }

  try {
    // Try to validate against Ollama models
    const isValid = await ollamaService.validateModel(model);
    if (!isValid) {
      const availableModels = await ollamaService.listModels();
      throw new ConfigValidationError(
        `Invalid model: ${model}. Available models are: ${availableModels.join(
          ", "
        )}`,
        "model"
      );
    }
  } catch (error) {
    if (error instanceof OllamaNotAvailableError) {
      // If Ollama is not available, use basic validation
      fallback();
    } else {
      throw error;
    }
  }
}

/**
 * Validate the entire configuration
 */
export async function validateConfig(
  config: Config,
  ollamaService?: OllamaService
): Promise<void> {
  // Validate data directory
  await validateDataDir(config.dataDir);

  // Validate model
  await validateModel(config.model, ollamaService);
}

/**
 * Validate a partial configuration update
 */
export async function validateConfigUpdate(
  updates: Partial<Config>,
  ollamaService?: OllamaService
): Promise<void> {
  if (updates.dataDir) {
    await validateDataDir(updates.dataDir);
  }
  if (updates.model) {
    await validateModel(updates.model, ollamaService);
  }
}
