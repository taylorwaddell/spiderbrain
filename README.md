# Spider Brain

A cross-platform knowledge-capture and retrieval system that helps you store and search through your ideas, concepts, and facts.

## Features

- Fast, local-first command-line interface
- AI-powered automatic tagging for better searchability
- Human-readable data storage format
- Cross-platform support (macOS, Linux)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/spiderbrain-ts.git
cd spiderbrain-ts

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

```bash
# Initialize Spider Brain
spiderbrain init

# Add a new node
spiderbrain new "Your text here"

# Search nodes
spiderbrain search "your search query"

# List all nodes
spiderbrain list

# Export your data
spiderbrain export
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

## Data Storage

Spider Brain stores all data locally in JSONL format, making it easy to inspect and backup your data. Each node is stored as a separate line in the data file, containing:

- Unique ID
- Timestamp
- Raw text
- AI-generated tags

## License

ISC
