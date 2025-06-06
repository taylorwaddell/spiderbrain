import { NodeSearch } from "../../core/search.js";
import { NodeStorage } from "../../core/storage.js";
import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";

export async function searchCommand(
  query: string,
  options: { limit?: string },
  storage: NodeStorage,
  search: NodeSearch
) {
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
    throw error;
  }
}
