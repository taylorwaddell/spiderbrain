#!/usr/bin/env node

import { AIService } from "./ai/services/ai.js";
import { ConfigManager } from "./core/config.js";
import { ExportFormat } from "./core/export/types.js";
import { Node } from "./core/types.js";
import { NodeSearch } from "./core/search.js";
import { NodeStorage } from "./core/storage.js";
import chalk from "chalk";
import { configCommand } from "./cli/commands/config.js";
import { exportCommand } from "./cli/commands/export.js";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";
import { program } from "commander";

// Initialize configuration
const configManager = new ConfigManager();

// Initialize AI service
const aiService = new AIService({
  defaultModel: {
    model: "phi4-mini",
    temperature: 0.0,
    max_tokens: 100,
    presence_penalty: 0.3,
    frequency_penalty: 0.1,
    stop: ["\n", ".", "!"],
  },
  models: {
    "phi4-mini": {
      model: "phi4-mini",
      temperature: 0.0,
      max_tokens: 100,
      presence_penalty: 0.3,
      frequency_penalty: 0.1,
      stop: ["\n", ".", "!"],
    },
  },
  enableLogging: true,
});

// Initialize storage and search
const storage = new NodeStorage(configManager, aiService);
const search = new NodeSearch();

// Initialize the program
program
  .name("spiderbrain")
  .description(
    "A cross-platform knowledge-capture and retrieval system that helps you store and search through your ideas, concepts, and facts."
  )
  .version("1.0.0");

// Initialize services before any commands
program.hook("preAction", async () => {
  try {
    await configManager.initialize();
    await aiService.initialize();
  } catch (error) {
    console.error(chalk.red("Failed to initialize services:"));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
});

// New command
program
  .command("new")
  .alias("n")
  .description(
    "Add a new node to the knowledge base. You can add text directly or from a file."
  )
  .argument("<content>", "Text content to add (ignored if --file is specified)")
  .option("-f, --file <path>", "Path to a file to add instead of direct text")
  .option(
    "--title <title>",
    "Custom title for the node (defaults to first 50 chars of content or filename)"
  )
  .action(
    async (content: string, options: { file?: string; title?: string }) => {
      const spinner = ora("Adding new node...").start();
      try {
        // Initialize storage if needed
        await storage.initialize();
        await storage.load();

        let nodeContent: string;
        let source: string;

        if (options.file) {
          try {
            nodeContent = await fs.readFile(options.file, "utf-8");
            source = options.file;
          } catch (error) {
            spinner.fail(chalk.red("Failed to read file"));
            if (error instanceof Error) {
              console.error(chalk.red(error.message));
            }
            process.exit(1);
          }
        } else {
          nodeContent = content;
          source = "direct_input";
        }

        // Create node
        const node = await storage.create({
          raw_text: nodeContent,
          metadata: {
            title:
              options.title ||
              (source === "direct_input"
                ? nodeContent.slice(0, 50) + "..."
                : source),
            source: source,
          },
        });

        // Update search index
        search.addNodes([node]);

        spinner.succeed(
          chalk.green(`Node added successfully with ID: ${node.id}`)
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to add node"));
        if (error instanceof Error) {
          console.error(chalk.red(error.message));
        } else {
          console.error(chalk.red("Unknown error occurred"));
        }
        process.exit(1);
      }
    }
  );

// Search command
program
  .command("search")
  .alias("s")
  .description(
    "Search through your knowledge base using natural language queries"
  )
  .argument("<query>", "Search query (supports natural language)")
  .option(
    "--limit <number>",
    "Maximum number of results to return (default: 10)",
    "10"
  )
  .action(async (query: string, options: { limit?: string }) => {
    const spinner = ora("Searching...").start();
    try {
      await storage.initialize();
      await storage.load();

      // Load all nodes and build search index if not already loaded
      if (!search.isIndexLoaded()) {
        const nodes = await storage.list();
        search.addNodes(nodes);
      }

      const results = search.search({
        query,
        limit: Number(options.limit) || 10,
      });

      spinner.stop();
      if (results.length === 0) {
        console.log(chalk.yellow("No results found."));
        return;
      }

      for (const result of results) {
        const node = result.node;
        console.log(chalk.green("---"));
        console.log(chalk.bold("ID:"), node.id);
        if (node.metadata?.title) {
          console.log(chalk.bold("Title:"), node.metadata.title);
        }
        console.log(chalk.bold("Content:"), node.raw_text.slice(0, 200));
        if (node.tags && node.tags.length > 0) {
          console.log(chalk.bold("Tags:"), node.tags.join(", "));
        }
        console.log(chalk.bold("Score:"), result.score.toFixed(2));
        if (result.matches && result.matches.length > 0) {
          console.log(chalk.bold("Matches:"), result.matches.join(", "));
        }
        console.log();
      }
    } catch (error) {
      spinner.fail(chalk.red("Search failed"));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      } else {
        console.error(chalk.red("Unknown error occurred"));
      }
      process.exit(1);
    }
  });

// Export command
program
  .command("export")
  .alias("e")
  .description("Export your knowledge base to a file or stdout")
  .option(
    "--format <format>",
    "Export format (json or text, default: text)",
    "text"
  )
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .action(async (options: { format: ExportFormat; output?: string }) => {
    await exportCommand(options);
  });

// Config command
program
  .command("config")
  .alias("c")
  .description("View or modify configuration settings")
  .argument("<action>", "Action to perform (get or set)")
  .argument("[key]", "Configuration key to get or set")
  .argument("[value]", "Value to set (required for set action)")
  .action(async (action: "get" | "set", key?: string, value?: string) => {
    await configCommand(action, key, value);
  });

// Parse command line arguments
program.parse();
