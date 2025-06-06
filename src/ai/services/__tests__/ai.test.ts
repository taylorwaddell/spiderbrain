import { AIService, AIServiceConfig } from "../ai.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OllamaModel } from "../../models/ollama.js";

// Mock the OllamaModel
vi.mock("../../models/ollama.js", () => ({
  OllamaModel: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue({
      content: "Test response",
      tokensUsed: 10,
      metadata: {
        totalDuration: 1000,
        loadDuration: 100,
        promptEvalDuration: 200,
        evalDuration: 700,
      },
    }),
    isReady: vi.fn().mockReturnValue(true),
    getConfig: vi.fn().mockReturnValue({
      model: "llama2",
      temperature: 0.7,
      maxTokens: 100,
    }),
  })),
}));

describe("AIService", () => {
  let service: AIService;
  const defaultConfig: AIServiceConfig = {
    defaultModel: {
      model: "llama2",
      temperature: 0.7,
      maxTokens: 100,
    },
    models: {
      mistral: {
        model: "mistral",
        temperature: 0.5,
        maxTokens: 200,
      },
    },
    enableLogging: true,
  };

  beforeEach(() => {
    service = new AIService(defaultConfig);
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with valid configuration", async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it("should throw error for invalid temperature", async () => {
      const invalidConfig = {
        ...defaultConfig,
        defaultModel: {
          ...defaultConfig.defaultModel,
          temperature: 1.5,
        },
      };
      service = new AIService(invalidConfig);
      await expect(service.initialize()).rejects.toThrow(
        "Invalid configuration"
      );
    });

    it("should initialize default model", async () => {
      await service.initialize();
      const model = service.getModel();
      expect(model).toBeInstanceOf(OllamaModel);
      expect(model.getConfig()).toEqual(defaultConfig.defaultModel);
    });

    it("should initialize additional models", async () => {
      await service.initialize();
      const model = service.getModel("mistral");
      expect(model).toBeInstanceOf(OllamaModel);
      expect(model.getConfig()).toEqual(defaultConfig.models.mistral);
    });
  });

  describe("model management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should get model by name", () => {
      const model = service.getModel("mistral");
      expect(model).toBeInstanceOf(OllamaModel);
    });

    it("should throw error for non-existent model", () => {
      expect(() => service.getModel("nonexistent")).toThrow(
        "Model not found: nonexistent"
      );
    });

    it("should get all models", () => {
      const models = service.getModels();
      expect(models.size).toBe(2); // default + mistral
      expect(models.get("default")).toBeInstanceOf(OllamaModel);
      expect(models.get("mistral")).toBeInstanceOf(OllamaModel);
    });
  });

  describe("configuration", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should get current configuration", () => {
      expect(service.getConfig()).toEqual(defaultConfig);
    });

    it("should update configuration", async () => {
      const newConfig = {
        defaultModel: {
          model: "llama2",
          temperature: 0.8,
          maxTokens: 150,
        },
      };
      await service.updateConfig(newConfig);
      expect(service.getConfig().defaultModel).toEqual(newConfig.defaultModel);
    });

    it("should throw error for invalid configuration update", async () => {
      const invalidConfig = {
        defaultModel: {
          model: "llama2",
          temperature: 1.5, // Invalid temperature
        },
      };
      await expect(service.updateConfig(invalidConfig)).rejects.toThrow(
        "Invalid configuration"
      );
    });
  });
});
