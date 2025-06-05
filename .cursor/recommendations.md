# Spider Brain TypeScript Implementation Guide

## Overview

This guide provides recommendations for building Spider Brain using TypeScript, with a focus on maintaining search performance as data scales.

## Critical Performance Decisions

### 1. Data Storage Format

Use **JSON Lines (.jsonl)** format instead of CSV:

```typescript
// Each line is a separate JSON object
{"id":"1234","timestamp":1691234567,"raw_text":"UHMW plastic...","tags":["UHMW","plastic","cutting board"]}
{"id":"1235","timestamp":1691234568,"raw_text":"Another node...","tags":["tag1","tag2"]}
```

**Benefits:**

- Streaming reads/writes (don't load entire file)
- Native JSON parsing (faster than CSV parsing)
- Handles complex data without escaping issues
- Append-only is trivial

### 2. In-Memory Index Architecture

```typescript
// On CLI startup, build these indexes
class NodeIndex {
  private byId: Map<string, Node> = new Map();
  private byTag: Map<string, Set<string>> = new Map(); // tag -> node IDs
  private fullTextIndex: MiniSearch<Node>; // or Lunr.js

  constructor() {
    this.fullTextIndex = new MiniSearch({
      fields: ["raw_text", "tags"],
      storeFields: ["id", "raw_text", "tags", "timestamp"],
    });
  }

  // Load only on first search, not on every CLI invocation
  async lazyLoad() {
    if (this.loaded) return;
    // Stream parse the JSONL file
    await this.streamLoadFromDisk();
  }
}
```

### 3. Lazy Loading Strategy

Don't load data until needed:

```typescript
const cli = new Command();

cli.command("new <text>").action(async (text) => {
  // Just append to file, no need to load existing data
  await appendNode(text);
});

cli.command("search <query>").action(async (query) => {
  // Only load index when searching
  await index.lazyLoad();
  const results = await index.search(query);
});
```

### 4. Search Implementation Options

#### Option A: MiniSearch (Recommended)

```typescript
import MiniSearch from "minisearch";

// Fast, full-text search with fuzzy matching
const miniSearch = new MiniSearch({
  fields: ["raw_text", "tags"],
  searchOptions: {
    boost: { tags: 2 }, // Prioritize tag matches
    fuzzy: 0.2,
    prefix: true,
  },
});
```

#### Option B: Custom Inverted Index

```typescript
class FastSearchIndex {
  private invertedIndex: Map<string, Set<string>> = new Map();

  addNode(node: Node) {
    // Tokenize and index
    const tokens = this.tokenize(node.raw_text + " " + node.tags.join(" "));
    tokens.forEach((token) => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(node.id);
    });
  }
}
```

### 5. Performance Optimizations

#### Use Worker Threads for Heavy Operations

```typescript
// search-worker.ts
import { Worker } from "worker_threads";

// Offload search to background thread
const searchWorker = new Worker("./search-worker.js");
searchWorker.postMessage({ command: "search", query });
```

#### Implement Caching

```typescript
class SearchCache {
  private cache = new LRU<string, SearchResult[]>(100); // LRU cache

  async search(query: string): Promise<SearchResult[]> {
    const cached = this.cache.get(query);
    if (cached) return cached;

    const results = await this.performSearch(query);
    this.cache.set(query, results);
    return results;
  }
}
```

### 6. Scaling Strategies

When you hit 10k+ nodes:

```typescript
// 1. Partition data by date
const getDataFile = (date: Date) => {
  return `data/nodes-${date.getFullYear()}-${date.getMonth()}.jsonl`;
};

// 2. Use SQLite when needed
import Database from "better-sqlite3";
// SQLite with FTS5 (full-text search) is incredibly fast

// 3. Consider DuckDB for analytical queries
import { Database } from "duckdb-async";
```

### 7. Recommended Dependencies

```json
{
  "dependencies": {
    "commander": "^11.0.0", // CLI framework
    "minisearch": "^6.1.0", // Fast full-text search
    "better-sqlite3": "^9.0.0", // For when you outgrow JSONL
    "p-queue": "^7.3.0", // Concurrency control
    "ora": "^7.0.0", // Spinner for AI tag generation
    "chalk": "^5.3.0" // Colored output
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0", // Run TS directly
    "vitest": "^1.0.0", // Fast testing
    "esbuild": "^0.19.0" // Bundle to single JS file
  }
}
```

### 8. Binary Distribution

```json
{
  "scripts": {
    "build": "esbuild src/cli.ts --bundle --platform=node --outfile=dist/spiderbrain.js",
    "package": "pkg dist/spiderbrain.js -t node18-macos-x64,node18-linux-x64"
  }
}
```

### 9. Performance Benchmarking

Add performance monitoring from day 1:

```typescript
import { performance } from "perf_hooks";

class PerformanceMonitor {
  async measureSearch(query: string) {
    const start = performance.now();
    const results = await this.search(query);
    const duration = performance.now() - start;

    if (duration > 200) {
      console.warn(`Slow search: ${duration}ms for "${query}"`);
    }
    return results;
  }
}
```

### 10. Future-Proofing for Native Module

Structure your code to make porting easy:

```typescript
// core/storage.ts - Pure functions, no Node.js dependencies
// core/search.ts - Algorithm implementation
// cli/index.ts - Node.js specific code

// This makes it easier to port core logic to Rust/Zig later
```

## Recommended Project Architecture

```
spiderbrain/
├── src/
│   ├── core/           # Pure TS, no Node deps
│   │   ├── types.ts
│   │   ├── search.ts
│   │   └── storage.ts
│   ├── cli/            # Node-specific
│   │   ├── commands/
│   │   └── index.ts
│   ├── ai/             # AI integration
│   │   └── tagger.ts
│   └── index.ts        # Entry point
├── data/               # JSONL files
│   └── nodes.jsonl
└── dist/               # Compiled output
```

## Implementation Strategy

1. **Start Simple**: Begin with JSONL + MiniSearch. This will easily handle 10k+ nodes with sub-100ms search times.

2. **Monitor Performance**: Include benchmarking from the start to identify when optimization is needed.

3. **Scale Gradually**: When you need more performance, the architecture above makes it easy to swap in SQLite or port hot paths to a faster language.

## Key Performance Tips

1. **Avoid Loading Everything**: Use streaming and lazy loading wherever possible
2. **Index Once**: Build indexes on startup, not on every search
3. **Cache Aggressively**: Cache search results, parsed data, and AI responses
4. **Measure Everything**: Add performance monitoring to identify bottlenecks early
5. **Batch Operations**: When processing multiple nodes, batch AI calls and disk writes

## Future GUI Integration Considerations

- Keep core logic separate from CLI code
- Use TypeScript interfaces to define clear contracts
- Consider creating a separate npm package for the core logic
- Design with both sync and async APIs where appropriate
- Document which functions are "hot paths" for future native porting

## Quick Start Commands

```bash
# Initialize project
npm init -y
npm install typescript tsx @types/node
npm install commander minisearch ora chalk

# Create basic structure
mkdir -p src/core src/cli src/ai data

# Run in development
npx tsx src/index.ts

# Build for production
npm run build

# Create binary
npm run package
```

## Performance Benchmarks to Aim For

- **Add Node**: < 50ms (excluding AI tagging)
- **Search 1k nodes**: < 50ms
- **Search 10k nodes**: < 200ms
- **Initial load 10k nodes**: < 500ms
- **Memory usage for 10k nodes**: < 100MB
