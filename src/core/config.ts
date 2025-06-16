import { dirname, join } from "path";

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

  constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath();
    this.config = { ...DEFAULT_CONFIG };
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
      } catch (error) {
        // If config doesn't exist, create it with defaults
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
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf-8"
      );
    } catch (error) {
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
    this.config = { ...this.config, ...updates };
    await this.save();
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
