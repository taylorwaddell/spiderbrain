# Spider Brain

A cross-platform knowledge-capture and retrieval system that helps you store and search through your ideas, concepts, and facts.

## Features

- Fast, local-first command-line interface
- Human-readable data storage format
- Cross-platform support (macOS, Linux)
- Configurable data storage location
- Flexible tag generation system
- Powerful search capabilities

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

The configuration is automatically created on first run and can be modified through the CLI.

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

Run tests with:

```bash
npm test
```

## License

ISC
