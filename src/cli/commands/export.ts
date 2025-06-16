import { Command } from "commander";
import { ConfigManager } from "../../core/config.js";
import { ExportFormat } from "../../core/export/types.js";
import { ExportService } from "../../core/export/service.js";
import { NodeStorage } from "../../core/storage.js";
import chalk from "chalk";
import { promises as fs } from "fs";
import { join } from "path";
import ora from "ora";

export async function exportCommand(
  options: {
    format: ExportFormat,
    fields?: string;
    delimiter?: string;
    dateFormat?: string;
    encoding?: string;
    output?: string;
  }
): Promise<void> {
  const spinner = ora("Preparing export...").start();
  const configManager = new ConfigManager();
  const storage = new NodeStorage(configManager);
  const exportService = new ExportService();

  try {
    // Initialize storage
    await configManager.initialize();
    await storage.initialize();
    await storage.load();

    // Get all nodes
    const nodes = await storage.list();
    if (nodes.length === 0) {
      spinner.fail(chalk.yellow("No nodes found to export"));
      return;
    }

    // Parse fields
    const fields = options.fields?.split(",").map((f) => f.trim()) || undefined;

    // Prepare export options
    const exportOptions = {
      format: options.format,
      fields,
      delimiter: options.delimiter,
      dateFormat: options.dateFormat,
      encoding: options.encoding,
      outputPath: options.output,
    };

    console.log('exportOptions.formatexportOptions.formatexportOptions.formatexportOptions.format')
    console.log(exportOptions.format) // always undefined
    console.log('exportOptions.formatexportOptions.formatexportOptions.formatexportOptions.format')

    // Export nodes
    spinner.text = "Exporting nodes...";
    const result =
      exportOptions.format === "csv"
        ? await exportService.exportToCSV(nodes, exportOptions)
        : await exportService.exportToJSON(nodes, exportOptions);

    if (result.success) {
      spinner.succeed(
        chalk.green(
          `Successfully exported ${result.stats.exportedNodes} nodes to ${result.outputPath}`
        )
      );
    } else {
      spinner.fail(
        chalk.red(
          `Failed to export nodes: ${result.error?.message || "Unknown error"}`
        )
      );
    }
  } catch (error) {
    spinner.fail(
      chalk.red(
        `Export failed: ${error instanceof Error ? error.message : String(error)}`
      )
    );
  }
}

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("Export nodes to CSV or JSON format")
    .argument("<format>", "Export format (csv or json)")
    .option(
      "-f, --fields <fields>",
      "Comma-separated list of fields to export (default: id,timestamp,raw_text,tags)"
    )
    .option("-d, --delimiter <delimiter>", "CSV delimiter (default: ,)", ",")
    .option("--date-format <format>", "Date format (default: ISO 8601)")
    .option(
      "-e, --encoding <encoding>",
      "File encoding (default: utf8)",
      "utf8"
    )
    .option(
      "-o, --output <path>",
      "Output file path (default: export_<timestamp>.<format>)"
    )
    .action(exportCommand);
}
