import { ModelError, modelConfigSchema, modelResponseSchema } from "../base.js";
import { describe, expect, it } from "vitest";

describe("AI Model Base Types", () => {
  describe("ModelConfig Schema", () => {
    it("should validate a valid model configuration", () => {
      const config = {
        model: "test-model",
        maxTokens: 100,
        temperature: 0.7,
      };

      const result = modelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject invalid temperature values", () => {
      const config = {
        model: "test-model",
        temperature: 1.5, // Invalid temperature
      };

      const result = modelConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should allow additional properties", () => {
      const config = {
        model: "test-model",
        customProperty: "value",
      };

      const result = modelConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe("ModelResponse Schema", () => {
    it("should validate a valid model response", () => {
      const response = {
        content: "Generated text",
        tokensUsed: 10,
        metadata: { key: "value" },
      };

      const result = modelResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it("should reject responses without required fields", () => {
      const response = {
        content: "Generated text",
        // Missing tokensUsed
      };

      const result = modelResponseSchema.safeParse(response);
      expect(result.success).toBe(false);
    });
  });

  describe("ModelError", () => {
    it("should create an error with code and cause", () => {
      const cause = new Error("Original error");
      const error = new ModelError("Test error", "TEST_ERROR", cause);

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.cause).toBe(cause);
      expect(error.name).toBe("ModelError");
    });
  });
});
