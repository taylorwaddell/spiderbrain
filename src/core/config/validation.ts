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
export function validateModel(model: string): void {
  const validModels = ["phi4-mini"]; // Add more models as they become available
  if (!validModels.includes(model)) {
    throw new ConfigValidationError(
      `Invalid model: ${model}. Valid models are: ${validModels.join(", ")}`,
      "model"
    );
  }
}

/**
 * Validate the entire configuration
 */
export async function validateConfig(config: Config): Promise<void> {
  // Validate data directory
  await validateDataDir(config.dataDir);

  // Validate model
  validateModel(config.model);
}

/**
 * Validate a partial configuration update
 */
export async function validateConfigUpdate(
  updates: Partial<Config>
): Promise<void> {
  if (updates.dataDir) {
    await validateDataDir(updates.dataDir);
  }
  if (updates.model) {
    validateModel(updates.model);
  }
}
