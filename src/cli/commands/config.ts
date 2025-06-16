import { NodeStorage, PathValidationError } from "../../core/storage.js";

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
          // First update the configuration
          await configManager.setDataDir(value);

          // Then initialize storage with the new path
          const storage = new NodeStorage(configManager);
          await storage.initialize();
          await storage.load();

          // Migrate data to new location
          spinner.text = "Migrating data to new location...";
          await storage.migrateData(value);
        } catch (error) {
          // If migration fails, revert the configuration
          await configManager.setDataDir(config.dataDir);

          if (error instanceof PathValidationError) {
            spinner.fail(chalk.red(`Path validation failed: ${error.message}`));
            console.error(chalk.red(`Path: ${error.path}`));
          } else {
            spinner.fail(
              chalk.red(
                `Failed to update data directory: ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
            );
          }
          process.exit(1);
        }
      } else {
        // For other keys, just update the configuration
        await configManager.updateConfig({ [key]: value });
      }

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
