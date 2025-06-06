import { Node } from "../../core/types.js";
import { NodeStorage } from "../../core/storage.js";
import chalk from "chalk";
import fs from "fs/promises";
import ora from "ora";
import path from "path";

export async function exportCommand(
  storage: NodeStorage,
  options: { format: string; output?: string }
): Promise<void> {
  const spinner = ora("Exporting knowledge base...").start();
  try {
    await storage.initialize();
    await storage.load();

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
      spinner.succeed(chalk.green(`Exported to ${options.output}`));
    } else {
      console.log(output);
      spinner.succeed(chalk.green("Export completed."));
    }
  } catch (error) {
    spinner.fail(chalk.red("Export failed"));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    } else {
      console.error(chalk.red("Unknown error occurred"));
    }
    throw error;
  }
}
