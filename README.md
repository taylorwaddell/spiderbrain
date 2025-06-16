# Spider Brain

A cross-platform knowledge-capture and retrieval system that helps you store and search through your ideas, concepts, and facts.

## Features

- Fast, local-first command-line interface
- Human-readable data storage format
- Cross-platform support (macOS, Linux)
- Configurable data storage location
- Flexible tag generation system
- Powerful search capabilities
- Robust configuration management
- Automatic data migration

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/spiderbrain-ts.git
cd spiderbrain-ts

# Install dependencies
npm install

# Build the project
npm run build

# Link the CLI (optional, for development)
npm link
```

## Configuration

Spider Brain uses a configuration system that supports:

- Custom data directory location
- Platform-specific paths
- Default values for all settings
- Automatic data migration
- Configuration validation
- Error recovery

The configuration is automatically created on first run and can be modified through the CLI.

### Configuration Commands

```bash
# View current configuration
spiderbrain config get

# View specific setting
spiderbrain config get dataDir
spiderbrain config get model

# Change data directory (with automatic migration)
spiderbrain config set dataDir /path/to/new/location

# Change model (when AI features are enabled)
spiderbrain config set model phi4-mini
```

### Configuration File

The configuration file is stored in:

- macOS/Linux: `~/.config/spiderbrain/config.json`
- Windows: `%APPDATA%\spiderbrain\config.json`

Example configuration:

```json
{
  "dataDir": "/path/to/data",
  "model": "phi4-mini"
}
```

### Data Migration

When changing the data directory:

1. The new directory is validated
2. Existing data is automatically migrated
3. The configuration is updated
4. If migration fails, the original configuration is restored

## Usage

```bash
# Initialize Spider Brain
spiderbrain init

# Add a new node
spiderbrain new "Your text here"
spiderbrain new --file path/to/file.txt
spiderbrain new --title "Custom Title" "Your text here"

# Search nodes
spiderbrain search "your search query"
spiderbrain search --limit 20 "your search query"

# List all nodes
spiderbrain list

# Export your data
spiderbrain export
spiderbrain export --format json
spiderbrain export --output path/to/file.txt
```

## Data Storage

Spider Brain stores all data locally in JSONL format, making it easy to inspect and backup your data. Each node is stored as a separate line in the data file, containing:

- Unique ID
- Timestamp
- Raw text
- Tags (optional)
- Metadata (title, source, etc.)

The data file is stored in the configured data directory (default: `./data/nodes.jsonl`).

### Data Directory Structure

```
data/
├── nodes.jsonl    # Main data file
└── .gitkeep      # Ensures directory is tracked by git
```

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Build for distribution
npm run build
```

## Testing

The project uses Vitest for testing. Tests are organized by feature and include:

- Configuration system tests
- Storage system tests
- Search functionality tests
- CLI command tests
- Configuration validation tests
- Data migration tests

Run tests with:

```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Permission Denied**

   - Ensure the data directory is writable
   - Check file permissions
   - Try running with elevated privileges

2. **Configuration Errors**

   - Verify the configuration file exists
   - Check file permissions
   - Ensure valid JSON format

3. **Migration Failures**
   - Ensure sufficient disk space
   - Check directory permissions
   - Verify path validity

## License

ISC
