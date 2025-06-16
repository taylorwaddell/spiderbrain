import {
  ConfigValidationError,
  validateConfig,
  validateConfigUpdate,
} from "./config/validation.js";
import { dirname, join } from "path";

import { OllamaService } from "../ai/services/ollama.js";
import { promises as fs } from "fs";
import { homedir } from "os";
import { platform } from "os";

/**
 * Configuration interface
 */
export interface Config {
  /** Data storage directory path */
  dataDir: string;
  /** Selected model name */
  model: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Config = {
  dataDir: join(process.cwd(), "data"),
  model: "phi4-mini",
};

/**
 * Get the platform-specific config directory path
 */
function getConfigDir(): string {
  const home = homedir();
  if (platform() === "win32") {
    return join(process.env.APPDATA || home, "spiderbrain");
  }
  return join(home, ".config", "spiderbrain");
}

/**
 * Get the full path to the config file
 */
function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

/**
 * Configuration manager
 */
export class ConfigManager {
  private config: Config;
  private configPath: string;
  private ollamaService: OllamaService | null = null;

  constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath();
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Set the Ollama service for model validation
   */
  setOllamaService(service: OllamaService): void {
    this.ollamaService = service;
  }

  /**
   * Initialize the configuration
   */
  async initialize(): Promise<void> {
    try {
      // Create config directory if it doesn't exist
      await fs.mkdir(dirname(this.configPath), { recursive: true });

      // Try to load existing config
      try {
        const data = await fs.readFile(this.configPath, "utf-8");
        const loadedConfig = JSON.parse(data);
        this.config = { ...DEFAULT_CONFIG, ...loadedConfig };

        // Validate loaded config
        await validateConfig(this.config, this.ollamaService || undefined);
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          // If validation fails, use defaults
          this.config = { ...DEFAULT_CONFIG };
        }
        // If config doesn't exist or is invalid, create it with defaults
        await this.save();
      }
    } catch (error) {
      throw new Error(`Failed to initialize configuration: ${error}`);
    }
  }

  /**
   * Save the current configuration
   */
  async save(): Promise<void> {
    try {
      // Validate before saving
      await validateConfig(this.config, this.ollamaService || undefined);

      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf-8"
      );
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw error;
      }
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * Update the configuration
   */
  async updateConfig(updates: Partial<Config>): Promise<void> {
    try {
      // Validate updates before applying
      await validateConfigUpdate(updates, this.ollamaService || undefined);

      this.config = { ...this.config, ...updates };
      await this.save();
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        throw error;
      }
      throw new Error(`Failed to update configuration: ${error}`);
    }
  }

  /**
   * Get the data directory path
   */
  getDataDir(): string {
    return this.config.dataDir;
  }

  /**
   * Set the data directory path
   */
  async setDataDir(path: string): Promise<void> {
    await this.updateConfig({ dataDir: path });
  }

  /**
   * Get the selected model
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Set the selected model
   */
  async setModel(model: string): Promise<void> {
    await this.updateConfig({ model });
  }
}
