import { Config, ConfigManager } from "../config.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dirname, join } from "path";

import { promises as fs } from "fs";

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  const testConfigPath = join(process.cwd(), "test-config.json");

  beforeEach(() => {
    // Create a new ConfigManager instance for each test
    configManager = new ConfigManager();
    // Override the config path for testing
    (configManager as any).configPath = testConfigPath;
  });

  afterEach(async () => {
    // Clean up test config file after each test
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore error if file doesn't exist
    }
  });

  describe("initialize", () => {
    it("should create config file with defaults if it does not exist", async () => {
      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.dataDir).toBeDefined();
      expect(config.model).toBe("phi4-mini");
    });

    it("should load existing config if it exists", async () => {
      // Create a test config file
      const testConfig: Config = {
        dataDir: "/test/data",
        model: "test-model",
      };
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig));

      await configManager.initialize();
      const config = configManager.getConfig();

      expect(config.dataDir).toBe("/test/data");
      expect(config.model).toBe("test-model");
    });
  });

  describe("updateConfig", () => {
    it("should update and save configuration", async () => {
      await configManager.initialize();

      const updates: Partial<Config> = {
        model: "new-model",
        dataDir: "/new/path",
      };

      await configManager.updateConfig(updates);
      const config = configManager.getConfig();

      expect(config.model).toBe("new-model");
      expect(config.dataDir).toBe("/new/path");
    });
  });

  describe("getDataDir", () => {
    it("should return the configured data directory", async () => {
      await configManager.initialize();
      const dataDir = configManager.getDataDir();
      expect(dataDir).toBeDefined();
    });
  });

  describe("setDataDir", () => {
    it("should update the data directory", async () => {
      await configManager.initialize();
      const newPath = "/new/data/path";

      await configManager.setDataDir(newPath);
      const dataDir = configManager.getDataDir();

      expect(dataDir).toBe(newPath);
    });
  });

  describe("getModel", () => {
    it("should return the configured model", async () => {
      await configManager.initialize();
      const model = configManager.getModel();
      expect(model).toBe("phi4-mini");
    });
  });

  describe("setModel", () => {
    it("should update the model", async () => {
      await configManager.initialize();
      const newModel = "new-model";

      await configManager.setModel(newModel);
      const model = configManager.getModel();

      expect(model).toBe(newModel);
    });
  });
});
