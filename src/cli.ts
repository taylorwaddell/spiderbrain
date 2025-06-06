#!/usr/bin/env node

import { Node } from "./core/types.js";
import { NodeSearch } from "./core/search.js";
import { NodeStorage } from "./core/storage.js";
import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";
import { program } from "commander";

// Initialize storage and search
const dataPath = join(process.cwd(), "data", "nodes.jsonl");
const storage = new NodeStorage(dataPath);
const search = new NodeSearch();

// Initialize the program
program
  .name("spiderbrain")
  .description("A cross-platform knowledge-capture and retrieval system")
  .version("1.0.0");

// New command
program
  .command("new")
  .alias("n")
  .description("Add a new node to the knowledge base")
  .argument("<content>", "Text content to add")
  .option("-f, --file <path>", "Path to a file to add instead of direct text")
  .option("--title <title>", "Custom title for the node")
  .action(
    async (content: string, options: { file?: string; title?: string }) => {
      const spinner = ora("Adding new node...").start();
      try {
        // Ensure data directory exists
        await fs.mkdir(join(process.cwd(), "data"), { recursive: true });

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
  .description("Search the knowledge base")
  .argument("<query>", "Search query")
  .option("--limit <number>", "Limit number of results", "10")
  .action(async (query: string, options: { limit?: string }) => {
    const spinner = ora("Searching...").start();
    try {
      // Ensure data directory exists
      await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
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
  .description("Export the knowledge base")
  .option("--format <format>", "Export format (json or text)", "text")
  .option("-o, --output <path>", "Output file path (default: stdout)")
  .action(async (options: { format: string; output?: string }) => {
    const spinner = ora("Exporting knowledge base...").start();
    try {
      // Ensure data directory exists
      await fs.mkdir(join(process.cwd(), "data"), { recursive: true });
      await storage.initialize();
      await storage.load();

      // Get all nodes
      const nodes = await storage.list();

      if (nodes.length === 0) {
        spinner.succeed(chalk.yellow("No nodes to export."));
        return;
      }

      let output: string;
      if (options.format.toLowerCase() === "json") {
        output = JSON.stringify(nodes, null, 2);
      } else if (options.format.toLowerCase() === "text") {
        output = nodes
          .map((node: Node) => {
            const lines = [
              chalk.green("---"),
              chalk.bold("ID:"),
              node.id,
              chalk.bold("Timestamp:"),
              new Date(node.timestamp).toISOString(),
            ];

            const title = node.metadata?.title;
            if (title && typeof title === "string") {
              lines.push(chalk.bold("Title:"), title);
            }

            lines.push(chalk.bold("Content:"), node.raw_text);

            if (node.tags && node.tags.length > 0) {
              lines.push(chalk.bold("Tags:"), node.tags.join(", "));
            }

            const source = node.metadata?.source;
            if (source && typeof source === "string") {
              lines.push(chalk.bold("Source:"), source);
            }

            return lines.join("\n");
          })
          .join("\n\n");
      } else {
        throw new Error(`Unsupported format: ${options.format}`);
      }

      if (options.output) {
        await fs.writeFile(options.output, output, "utf-8");
        spinner.succeed(chalk.green(`Export completed to ${options.output}`));
      } else {
        spinner.stop();
        console.log(output);
      }
    } catch (error) {
      spinner.fail(chalk.red("Export failed"));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
      } else {
        console.error(chalk.red("Unknown error occurred"));
      }
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
