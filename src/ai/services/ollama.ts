import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Error thrown when Ollama is not available
 */
export class OllamaNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaNotAvailableError";
  }
}

/**
 * Error thrown when Ollama command fails
 */
export class OllamaCommandError extends Error {
  constructor(message: string, public readonly command: string) {
    super(message);
    this.name = "OllamaCommandError";
  }
}

/**
 * Service for interacting with Ollama
 */
export class OllamaService {
  private modelCache: string[] | null = null;
  private lastCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * List all available Ollama models
   */
  async listModels(): Promise<string[]> {
    try {
      // Check cache first
      if (
        this.modelCache &&
        Date.now() - this.lastCacheTime < this.CACHE_DURATION
      ) {
        return this.modelCache;
      }

      // Run ollama list command
      const { stdout } = await execAsync("ollama list");

      // Parse the output
      const models = stdout
        .split("\n")
        .slice(1) // Skip header line
        .filter(Boolean) // Remove empty lines
        .map((line) => {
          const [name] = line.split(/\s+/);
          return name;
        });

      // Update cache
      this.modelCache = models;
      this.lastCacheTime = Date.now();

      return models;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("command not found")) {
          throw new OllamaNotAvailableError(
            "Ollama is not installed or not in PATH. Please install Ollama first."
          );
        }
        throw new OllamaCommandError(
          `Failed to list models: ${error.message}`,
          "ollama list"
        );
      }
      throw error;
    }
  }

  /**
   * Validate if a model is available
   */
  async validateModel(model: string): Promise<boolean> {
    try {
      const models = await this.listModels();
      return models.includes(model);
    } catch (error) {
      if (error instanceof OllamaNotAvailableError) {
        // If Ollama is not available, allow any model
        // This is a fallback for when Ollama is not installed
        return true;
      }
      throw error;
    }
  }

  /**
   * Clear the model cache
   */
  clearCache(): void {
    this.modelCache = null;
    this.lastCacheTime = 0;
  }
}
