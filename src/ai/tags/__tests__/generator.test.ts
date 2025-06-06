import { TagConfig, TagError, TagFormat } from "../types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AIService } from "../../services/ai.js";
import { TagGenerator } from "../generator.js";

// Mock AIService
const mockAIService = {
  getModel: vi.fn().mockReturnValue({
    generate: vi.fn().mockResolvedValue({
      content: "tag1, tag2, tag3",
      tokensUsed: 10,
      metadata: {
        totalDuration: 1000,
        loadDuration: 100,
        promptEvalDuration: 200,
        evalDuration: 700,
      },
    }),
    getConfig: vi.fn().mockReturnValue({
      model: "llama2",
      temperature: 0.7,
      maxTokens: 100,
    }),
  }),
} as unknown as AIService;

describe("TagGenerator", () => {
  let generator: TagGenerator;
  const defaultConfig: TagConfig = {
    format: "hashtag",
    maxTags: 5,
    minRelevance: 0.5,
    deduplicate: true,
  };

  beforeEach(() => {
    generator = new TagGenerator(mockAIService, defaultConfig);
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default config", () => {
      expect(generator.getConfig()).toEqual(defaultConfig);
    });

    it("should initialize with custom config", () => {
      const customConfig: TagConfig = {
        format: "plain",
        maxTags: 10,
        minRelevance: 0.7,
        deduplicate: false,
      };
      generator = new TagGenerator(mockAIService, customConfig);
      expect(generator.getConfig()).toEqual(customConfig);
    });
  });

  describe("tag generation", () => {
    it("should generate tags successfully", async () => {
      const result = await generator.generateTags({
        content: "Test content",
      });

      expect(result.tags).toHaveLength(3);
      expect(result.tags[0].text).toBe("#tag1");
      expect(result.metadata.generationTime).toBeGreaterThan(0);
      expect(result.metadata.totalTags).toBe(3);
      expect(result.metadata.filteredTags).toBe(3);
    });

    it("should handle empty content", async () => {
      const result = await generator.generateTags({
        content: "",
      });

      expect(result.tags).toHaveLength(3);
      expect(result.metadata.totalTags).toBe(3);
    });

    it("should handle model errors", async () => {
      const errorModel = {
        generate: vi.fn().mockRejectedValue(new Error("Model error")),
        getConfig: vi.fn().mockReturnValue({
          model: "llama2",
        }),
      };

      await expect(
        generator.generateTags({
          content: "Test content",
          model: errorModel as any,
        })
      ).rejects.toThrow(TagError);
    });
  });

  describe("tag formatting", () => {
    it.each<[TagFormat, string]>([
      ["hashtag", "#tag1"],
      ["plain", "tag1"],
      ["custom", "prefix-tag1-suffix"],
    ])("should format tags as %s", async (format, expected) => {
      const customConfig: TagConfig = {
        ...defaultConfig,
        format,
        customFormat: format === "custom" ? "prefix-{tag}-suffix" : undefined,
      };
      generator = new TagGenerator(mockAIService, customConfig);

      const result = await generator.generateTags({
        content: "Test content",
      });

      expect(result.tags[0].text).toBe(expected);
    });

    it("should throw error for invalid format", async () => {
      const invalidConfig: TagConfig = {
        ...defaultConfig,
        format: "invalid" as TagFormat,
      };
      generator = new TagGenerator(mockAIService, invalidConfig);

      await expect(
        generator.generateTags({
          content: "Test content",
        })
      ).rejects.toThrow(TagError);
    });
  });

  describe("tag filtering", () => {
    it("should limit number of tags", async () => {
      const customConfig: TagConfig = {
        ...defaultConfig,
        maxTags: 2,
      };
      generator = new TagGenerator(mockAIService, customConfig);

      const result = await generator.generateTags({
        content: "Test content",
      });

      expect(result.tags).toHaveLength(2);
      expect(result.metadata.filteredTags).toBe(2);
    });

    it("should deduplicate tags", async () => {
      const mockModel = {
        generate: vi.fn().mockResolvedValue({
          content: "tag1, tag1, tag2",
          tokensUsed: 10,
          metadata: {
            totalDuration: 1000,
            loadDuration: 100,
            promptEvalDuration: 200,
            evalDuration: 700,
          },
        }),
        getConfig: vi.fn().mockReturnValue({
          model: "llama2",
        }),
      };

      const result = await generator.generateTags({
        content: "Test content",
        model: mockModel as any,
      });

      expect(result.tags).toHaveLength(2);
      expect(result.metadata.totalTags).toBe(3);
      expect(result.metadata.filteredTags).toBe(2);
    });
  });

  describe("configuration", () => {
    it("should update configuration", () => {
      const newConfig: Partial<TagConfig> = {
        format: "plain",
        maxTags: 10,
      };
      generator.updateConfig(newConfig);

      expect(generator.getConfig()).toEqual({
        ...defaultConfig,
        ...newConfig,
      });
    });
  });
});
