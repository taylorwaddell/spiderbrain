#!/usr/bin/env node

import { mkdirSync, readFileSync } from "fs";

import { AIService } from "../ai/services/ai.js";
import { Command } from "commander";
import { NodeManager } from "../core/manager.js";
import { homedir } from "os";
import { join } from "path";
import { registerExportCommand } from "./commands/export.js";

const program = new Command();

// Get version from package.json
const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8")
);

program
  .name("spiderbrain")
  .description("AI-powered tag generation for your content")
  .version(packageJson.version);

// Initialize services
const dataDir = join(homedir(), ".spiderbrain");
const dataPath = join(dataDir, "nodes.jsonl");

// Ensure data directory exists
try {
  mkdirSync(dataDir, { recursive: true });
} catch (error) {
  console.error(
    "Failed to create data directory:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}

const aiService = new AIService({
  defaultModel: {
    model: "llama2",
  },
  models: {
    llama2: {
      model: "llama2",
      apiKey: process.env.LLAMA_API_KEY,
    },
  },
});

const nodeManager = new NodeManager(dataPath, aiService);

// Initialize services before any command
program.hook("preAction", async () => {
  try {
    await aiService.initialize();
    await nodeManager.initialize();
  } catch (error) {
    console.error(
      "Failed to initialize services:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
});

// Add node command
program
  .command("n")
  .description("Add a new node")
  .argument("<content>", "Content of the node")
  .option("-t, --tags <tags...>", "Tags for the node")
  .action(async (content, options) => {
    try {
      const node = await nodeManager.createNode({
        raw_text: content,
        tags: options.tags,
      });
      console.log(`Node added successfully with ID: ${node.id}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add list command
program
  .command("ls")
  .description("List all nodes")
  .action(async () => {
    try {
      const nodes = await nodeManager.listNodes();
      nodes.forEach((node) => {
        console.log(`[${node.id}] ${node.raw_text}`);
        if (node.tags && node.tags.length > 0) {
          console.log(`Tags: ${node.tags.join(", ")}`);
        }
        console.log("---");
      });
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add get command
program
  .command("get")
  .description("Get a node by ID")
  .argument("<id>", "Node ID")
  .action(async (id) => {
    try {
      const node = await nodeManager.getNode(id);
      console.log(`[${node.id}] ${node.raw_text}`);
      if (node.tags && node.tags.length > 0) {
        console.log(`Tags: ${node.tags.join(", ")}`);
      }
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add update command
program
  .command("update")
  .description("Update a node")
  .argument("<id>", "Node ID")
  .argument("<content>", "New content")
  .option("-t, --tags <tags...>", "New tags")
  .action(async (id, content, options) => {
    try {
      const node = await nodeManager.updateNode(id, {
        raw_text: content,
        tags: options.tags,
      });
      console.log(`Node updated successfully: ${node.id}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add delete command
program
  .command("delete")
  .description("Delete a node")
  .argument("<id>", "Node ID")
  .action(async (id) => {
    try {
      await nodeManager.deleteNode(id);
      console.log(`Node deleted successfully: ${id}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Add count command
program
  .command("count")
  .description("Get the total number of nodes")
  .action(async () => {
    try {
      const count = await nodeManager.getNodeCount();
      console.log(`Total nodes: ${count}`);
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Register export command
registerExportCommand(program);

// Parse command line arguments
program.parse();
