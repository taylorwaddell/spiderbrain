import { ConfigManager } from "../../core/config.js";
import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";

export async function configCommand(
  action: "get" | "set",
  key?: string,
  value?: string
): Promise<void> {
  const spinner = ora("Managing configuration...").start();
  const configManager = new ConfigManager();

  try {
    await configManager.initialize();
    const config = configManager.getConfig();

    if (action === "get") {
      spinner.stop();
      if (key) {
        // Get specific config value
        if (key in config) {
          console.log(
            chalk.green(`${key}:`),
            config[key as keyof typeof config]
          );
        } else {
          console.log(chalk.yellow(`Unknown configuration key: ${key}`));
          console.log(chalk.yellow("Available keys:"));
          Object.keys(config).forEach((k) =>
            console.log(chalk.yellow(`  - ${k}`))
          );
        }
      } else {
        // Get all config values
        console.log(chalk.green("Current configuration:"));
        Object.entries(config).forEach(([k, v]) => {
          console.log(chalk.green(`${k}:`), v);
        });
      }
    } else if (action === "set") {
      if (!key || !value) {
        spinner.fail(
          chalk.red("Both key and value are required for set command")
        );
        process.exit(1);
      }

      // Validate key
      if (!(key in config)) {
        spinner.fail(chalk.red(`Unknown configuration key: ${key}`));
        console.log(chalk.yellow("Available keys:"));
        Object.keys(config).forEach((k) =>
          console.log(chalk.yellow(`  - ${k}`))
        );
        process.exit(1);
      }

      // Special handling for dataDir
      if (key === "dataDir") {
        try {
          // Ensure directory exists
          await fs.mkdir(value, { recursive: true });
          // Check if directory is writable
          await fs.access(value, fs.constants.W_OK);
        } catch (error) {
          spinner.fail(chalk.red(`Invalid or unwritable directory: ${value}`));
          process.exit(1);
        }
      }

      // Update configuration
      await configManager.updateConfig({ [key]: value });
      spinner.succeed(chalk.green(`Configuration updated: ${key} = ${value}`));
    }
  } catch (error) {
    spinner.fail(chalk.red("Failed to manage configuration"));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}
