import { Tag, TagConfig, TagError, TagFormat } from "../types.js";
import { beforeEach, describe, expect, it } from "vitest";

import { TagGenerator } from "../generator.js";

describe("TagGenerator", () => {
  let generator: TagGenerator;
  const defaultConfig: TagConfig = {
    format: "hashtag",
    maxTags: 5,
    minRelevance: 0.5,
    deduplicate: true,
  };

  beforeEach(async () => {
    generator = new TagGenerator(null, defaultConfig);
    await generator.initialize();
  });

  describe("initialization", () => {
    it("should initialize with default config", async () => {
      const newGenerator = new TagGenerator(null, defaultConfig);
      await newGenerator.initialize();
      expect(newGenerator.getConfig()).toEqual(defaultConfig);
    });

    it("should initialize with custom config", async () => {
      const customConfig: TagConfig = {
        format: "plain",
        maxTags: 10,
        minRelevance: 0.7,
        deduplicate: false,
      };
      const newGenerator = new TagGenerator(null, customConfig);
      await newGenerator.initialize();
      expect(newGenerator.getConfig()).toEqual(customConfig);
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
      generator = new TagGenerator(null, customConfig);
      await generator.initialize();
      const tags: Tag[] = [{ text: "tag1", relevance: 1, category: undefined }];
      const result = generator["formatTags"](tags, customConfig);
      expect(result[0].text).toBe(expected);
    });

    it("should throw error for invalid format", async () => {
      const invalidConfig: TagConfig = {
        ...defaultConfig,
        format: "invalid" as TagFormat,
      };
      generator = new TagGenerator(null, invalidConfig);
      await generator.initialize();
      const tags: Tag[] = [{ text: "tag1", relevance: 1, category: undefined }];
      expect(() => generator["formatTags"](tags, invalidConfig)).toThrow(
        TagError
      );
    });
  });

  describe("tag filtering", () => {
    it("should limit number of tags", () => {
      const customConfig: TagConfig = {
        ...defaultConfig,
        maxTags: 2,
      };
      generator = new TagGenerator(null, customConfig);
      const tags: Tag[] = [
        { text: "tag1", relevance: 1, category: undefined },
        { text: "tag2", relevance: 1, category: undefined },
        { text: "tag3", relevance: 1, category: undefined },
      ];
      const result = generator["filterTags"](tags, customConfig);
      expect(result).toHaveLength(2);
    });

    it("should deduplicate tags", () => {
      const customConfig: TagConfig = {
        ...defaultConfig,
        deduplicate: true,
      };
      generator = new TagGenerator(null, customConfig);
      const tags: Tag[] = [
        { text: "tag1", relevance: 1, category: undefined },
        { text: "tag1", relevance: 1, category: undefined },
        { text: "tag2", relevance: 1, category: undefined },
      ];
      const result = generator["filterTags"](tags, customConfig);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.text)).toEqual(["tag1", "tag2"]);
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
