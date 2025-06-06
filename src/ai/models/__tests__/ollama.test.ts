import { OllamaConfig, OllamaModel } from "../ollama.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModelError } from "../base.js";
import { Ollama } from "ollama";

// Create a mock Ollama instance with all required methods
const createMockOllama = (overrides = {}) => {
  const mock: Partial<Ollama> = {
    list: vi.fn().mockResolvedValue({
      models: [
        { name: "llama2", size: 4096 },
        { name: "mistral", size: 4096 },
      ],
    }),
    generate: vi.fn().mockResolvedValue({
      response: "Test response",
      done: true,
      eval_count: 10,
      total_duration: 1000,
      load_duration: 100,
      prompt_eval_duration: 200,
      eval_duration: 700,
    }),
    encodeImage: vi.fn(),
    fileExists: vi.fn(),
    create: vi.fn(),
    config: vi.fn(),
    delete: vi.fn(),
    pull: vi.fn(),
    push: vi.fn(),
    show: vi.fn(),
    copy: vi.fn(),
    chat: vi.fn(),
    embeddings: vi.fn(),
    stream: vi.fn(),
    streamChat: vi.fn(),
    streamGenerate: vi.fn(),
    streamEmbeddings: vi.fn(),
    fetch: vi.fn(),
    ongoingStreamedRequests: new Map(),
    abort: vi.fn(),
    processStreamableRequest: vi.fn(),
    embed: vi.fn(),
    ps: vi.fn(),
    ...overrides,
  };
  return mock as Ollama;
};

// Mock the Ollama client
vi.mock("ollama", () => ({
  Ollama: vi.fn().mockImplementation(() => createMockOllama()),
}));

describe("OllamaModel", () => {
  let model: OllamaModel;
  const defaultConfig: OllamaConfig = {
    model: "llama2",
    temperature: 0.7,
    maxTokens: 100,
  };

  beforeEach(() => {
    model = new OllamaModel(defaultConfig);
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with valid configuration", async () => {
      await expect(model.initialize(defaultConfig)).resolves.not.toThrow();
      expect(model.isReady()).toBe(true);
    });

    it("should throw error for invalid temperature", async () => {
      const invalidConfig = { ...defaultConfig, temperature: 1.5 };
      await expect(model.initialize(invalidConfig)).rejects.toThrow(ModelError);
      expect(model.isReady()).toBe(false);
    });

    it("should throw error for non-existent model", async () => {
      const invalidConfig = { ...defaultConfig, model: "nonexistent" };
      await expect(model.initialize(invalidConfig)).rejects.toThrow(ModelError);
      expect(model.isReady()).toBe(false);
    });
  });

  describe("generate", () => {
    beforeEach(async () => {
      await model.initialize(defaultConfig);
    });

    it("should generate response with valid prompt", async () => {
      const response = await model.generate("Test prompt");
      expect(response.content).toBe("Test response");
      expect(response.tokensUsed).toBe(10);
      expect(response.metadata).toEqual({
        totalDuration: 1000,
        loadDuration: 100,
        promptEvalDuration: 200,
        evalDuration: 700,
      });
    });

    it("should throw error if model is not initialized", async () => {
      const uninitializedModel = new OllamaModel(defaultConfig);
      await expect(uninitializedModel.generate("Test prompt")).rejects.toThrow(
        ModelError
      );
    });

    it("should handle generation errors", async () => {
      const mockError = new Error("Generation failed");
      vi.mocked(Ollama).mockImplementationOnce(() => ({
        list: vi.fn().mockResolvedValue({
          models: [{ name: "llama2", size: 4096 }],
        }),
        generate: vi.fn().mockRejectedValue(mockError),
      }));

      const newModel = new OllamaModel(defaultConfig);
      await newModel.initialize(defaultConfig);
      await expect(newModel.generate("Test prompt")).rejects.toThrow(
        ModelError
      );
    });
  });

  describe("configuration", () => {
    it("should return current configuration", () => {
      expect(model.getConfig()).toEqual(defaultConfig);
    });

    it("should update configuration after initialization", async () => {
      const newConfig = { ...defaultConfig, temperature: 0.5 };
      await model.initialize(newConfig);
      expect(model.getConfig()).toEqual(newConfig);
    });
  });

  describe("retry functionality", () => {
    beforeEach(async () => {
      await model.initialize(defaultConfig);
    });

    it("should retry on temporary network failure", async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          response: "Test response",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        });

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      const response = await model.generate("Test prompt");
      expect(response.content).toBe("Test response");
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it("should retry on server error (5xx)", async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("500 Internal Server Error"))
        .mockResolvedValueOnce({
          response: "Test response",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        });

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      const response = await model.generate("Test prompt");
      expect(response.content).toBe("Test response");
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it("should fail immediately for non-retryable errors", async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("Invalid request"));

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      await expect(model.generate("Test prompt")).rejects.toThrow(ModelError);
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it("should respect custom retry configuration", async () => {
      const customConfig = {
        ...defaultConfig,
        retry: {
          maxRetries: 1,
          initialDelay: 100,
          maxDelay: 200,
          factor: 2,
        },
      };

      await model.initialize(customConfig);

      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          response: "Test response",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        });

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      await expect(model.generate("Test prompt")).rejects.toThrow(ModelError);
      expect(mockGenerate).toHaveBeenCalledTimes(2); // maxRetries + 1
    });

    it("should track retry attempts", async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          response: "Test response",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        });

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      await expect(model.generate("Test prompt")).rejects.toThrow(ModelError);
      expect(mockGenerate).toHaveBeenCalledTimes(3); // maxRetries + 1
    });

    it("should handle concurrent retry operations", async () => {
      const mockGenerate = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          response: "Test response 1",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          response: "Test response 2",
          done: true,
          eval_count: 10,
          total_duration: 1000,
          load_duration: 100,
          prompt_eval_duration: 200,
          eval_duration: 700,
        });

      vi.mocked(Ollama).mockImplementationOnce(() =>
        createMockOllama({ generate: mockGenerate })
      );

      const [response1, response2] = await Promise.all([
        model.generate("Test prompt 1"),
        model.generate("Test prompt 2"),
      ]);

      expect(response1.content).toBe("Test response 1");
      expect(response2.content).toBe("Test response 2");
      expect(mockGenerate).toHaveBeenCalledTimes(4);
    });
  });
});
