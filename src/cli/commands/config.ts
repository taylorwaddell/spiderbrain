import { NodeStorage, PathValidationError } from "../../core/storage.js";
import {
  OllamaNotAvailableError,
  OllamaService,
} from "../../ai/services/ollama.js";

import { ConfigManager } from "../../core/config.js";
import { ConfigValidationError } from "../../core/config/validation.js";
import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";

export async function configCommand(
  action: "get" | "set" | "list-models",
  key?: string,
  value?: string
): Promise<void> {
  const spinner = ora("Managing configuration...").start();
  const configManager = new ConfigManager();
  const ollamaService = new OllamaService();

  try {
    await configManager.initialize();
    configManager.setOllamaService(ollamaService);
    const config = configManager.getConfig();

    if (action === "list-models") {
      spinner.stop();
      try {
        const models = await ollamaService.listModels();
        console.log(chalk.green("Available models:"));
        models.forEach((model) => {
          console.log(chalk.yellow(`  - ${model}`));
        });
      } catch (error) {
        if (error instanceof OllamaNotAvailableError) {
          console.log(chalk.yellow("Ollama is not installed or not in PATH."));
          console.log(chalk.yellow("Default model: phi4-mini"));
        } else {
          console.error(chalk.red("Failed to list models:"));
          console.error(
            chalk.red(error instanceof Error ? error.message : String(error))
          );
        }
      }
      return;
    }

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

      try {
        // Special handling for dataDir
        if (key === "dataDir") {
          // First update the configuration
          await configManager.setDataDir(value);

          // Then initialize storage with the new path
          const storage = new NodeStorage(configManager);
          await storage.initialize();
          await storage.load();

          // Migrate data to new location
          spinner.text = "Migrating data to new location...";
          await storage.migrateData(value);
        } else if (key === "model") {
          // For model changes, show available models
          try {
            const models = await ollamaService.listModels();
            console.log(chalk.green("Available models:"));
            models.forEach((model) => {
              console.log(chalk.yellow(`  - ${model}`));
            });
          } catch (error) {
            if (error instanceof OllamaNotAvailableError) {
              console.log(
                chalk.yellow("Ollama is not installed or not in PATH.")
              );
              console.log(chalk.yellow("Default model: phi4-mini"));
            }
          }

          // Update the model
          await configManager.setModel(value);
        } else {
          // For other keys, just update the configuration
          await configManager.updateConfig({ [key]: value });
        }

        spinner.succeed(
          chalk.green(`Configuration updated: ${key} = ${value}`)
        );
      } catch (error) {
        // If migration fails, revert the configuration
        if (key === "dataDir") {
          await configManager.setDataDir(config.dataDir);
        }

        if (error instanceof ConfigValidationError) {
          spinner.fail(
            chalk.red(`Configuration validation failed: ${error.message}`)
          );
          if (error.field) {
            console.error(chalk.red(`Field: ${error.field}`));
          }
        } else if (error instanceof PathValidationError) {
          spinner.fail(chalk.red(`Path validation failed: ${error.message}`));
          console.error(chalk.red(`Path: ${error.path}`));
        } else {
          spinner.fail(
            chalk.red(
              `Failed to update configuration: ${
                error instanceof Error ? error.message : String(error)
              }`
            )
          );
        }
        process.exit(1);
      }
    }
  } catch (error) {
    spinner.fail(chalk.red("Failed to manage configuration"));
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    }
    process.exit(1);
  }
}
