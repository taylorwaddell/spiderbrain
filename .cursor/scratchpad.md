# SpiderBrain CLI Implementation Plan

## Background and Motivation

SpiderBrain is a tool designed to help users manage and navigate through their knowledge base by creating a graph of interconnected nodes. For the MVP, we're focusing on three core commands that provide the essential functionality: creating new nodes, searching the knowledge base, and exporting the graph.

## AI Implementation Plan

### Architecture Overview

1. Core Components:

   - `AIModel` interface for model abstraction
   - `OllamaModel` implementation for local Ollama models
   - `AIService` for managing model interactions
   - `TagGenerator` for AI-powered tag generation

2. Directory Structure:

```
src/
├── ai/
│   ├── models/
│   │   ├── base.ts        # AIModel interface
│   │   ├── ollama.ts      # OllamaModel implementation
│   │   └── index.ts       # Model exports
│   ├── services/
│   │   ├── ai-service.ts  # AIService implementation
│   │   └── index.ts       # Service exports
│   └── generators/
│       ├── tagger.ts      # TagGenerator implementation
│       └── index.ts       # Generator exports
```

### Implementation Steps

1. Core Interfaces and Types

   - [ ] Define `AIModel` interface
   - [ ] Define model configuration types
   - [ ] Define response types
   - [ ] Define error types

2. Ollama Integration

   - [ ] Implement `OllamaModel` class
   - [ ] Add Ollama API client
   - [ ] Add model configuration
   - [ ] Add error handling
   - [ ] Add retry logic

3. AI Service

   - [ ] Implement `AIService` class
   - [ ] Add model management
   - [ ] Add request queuing
   - [ ] Add caching
   - [ ] Add error handling

4. Tag Generation

   - [ ] Implement `TagGenerator` class
   - [ ] Add prompt templates
   - [ ] Add tag extraction
   - [ ] Add tag validation
   - [ ] Add caching

5. CLI Integration

   - [ ] Add AI configuration options
   - [ ] Add model selection
   - [ ] Add tag generation to new command
   - [ ] Add tag suggestions to search

6. Testing
   - [ ] Add unit tests for models
   - [ ] Add unit tests for services
   - [ ] Add unit tests for generators
   - [ ] Add integration tests
   - [ ] Add mock Ollama server

### Dependencies

```json
{
  "dependencies": {
    "ollama": "^0.1.0", // Ollama API client
    "p-queue": "^7.3.0", // Request queuing
    "node-fetch": "^3.3.0", // HTTP client
    "zod": "^3.22.0" // Runtime type checking
  }
}
```

### Key Design Decisions

1. Model Abstraction

   - Use interface-based design for model abstraction
   - Allow easy addition of new model implementations
   - Support model-specific configuration

2. Error Handling

   - Define clear error types
   - Implement retry logic for transient failures
   - Provide meaningful error messages

3. Performance

   - Implement request queuing
   - Add response caching
   - Support batch processing

4. Configuration

   - Support model-specific settings
   - Allow runtime model switching
   - Support environment variables

5. Testing
   - Mock Ollama server for testing
   - Support offline testing
   - Add performance benchmarks

### Success Criteria

1. Core Functionality

   - [ ] Can connect to local Ollama instance
   - [ ] Can generate tags for new nodes
   - [ ] Can suggest tags for search
   - [ ] Handles errors gracefully

2. Performance

   - [ ] Response time < 1s for tag generation
   - [ ] Memory usage < 100MB
   - [ ] Supports concurrent requests

3. Reliability

   - [ ] Handles network errors
   - [ ] Handles model errors
   - [ ] Provides fallback options

4. Extensibility
   - [ ] Easy to add new models
   - [ ] Easy to modify prompts
   - [ ] Easy to add new features

## Key Challenges and Analysis

1. Command Structure

   - Need simple, clear command names
   - Should support both long and short flags
   - Need to handle file paths and content properly
   - Should provide clear feedback

2. User Experience

   - Commands should be intuitive
   - Help text should be clear
   - Error messages should be actionable
   - Should handle common edge cases

3. Data Management

   - Need to ensure data directory exists
   - Need to handle file encoding properly
   - Need to manage search index updates
   - Need to handle concurrent access safely

4. Performance Considerations
   - Search index should be updated efficiently
   - File operations should be non-blocking
   - Memory usage should be monitored
   - Large files should be handled gracefully

## High-level Task Breakdown

### 1. Base Command Structure

- [x] Set up CLI project structure
  - Success: Can run `spiderbrain --help` and see available commands
  - Success: Each command shows its own help with `--help` flag

### 2. New Node Command

- [x] `spiderbrain new <content> [-f <file>] [--title "Title"]` or `spiderbrain -n <content> [-f <file>] [--title "Title"]`
  - Success: Can add a new node from direct text
  - Success: Can add a new node from file with -f flag
  - Success: Can specify custom title (optional)
  - Success: Shows confirmation message with node ID
  - Success: Handles file not found errors gracefully
  - Success: Updates search index properly

### 3. Search Command

- [x] `spiderbrain search <query>` or `spiderbrain -s <query>`
  - Success: Can search nodes by content
  - Success: Shows relevant node information
  - Success: Shows clear "no results" message when appropriate
  - Success: Handles empty queries gracefully
  - Success: Loads search index if not already loaded

### 4. Export Command

- [x] `spiderbrain export [--format json|text]` or `spiderbrain -e [--format json|text]`
  - Success: Can export entire graph
  - Success: Supports different output formats
  - Success: Shows clear export confirmation
  - Success: Handles empty graph gracefully
  - Success: Formats output appropriately for each format type
  - Success: Handles file write errors gracefully
  - Success: Provides progress indication for large exports

### 5. Test Coverage

#### Search Command Tests

- [x] Basic functionality
  - Test successful search with exact match
  - Test successful search with fuzzy match
  - Test search with multiple results
  - Test search with no results
  - Test search with empty query
  - Test search with limit option
- [x] Error handling
  - Test search with invalid limit value
  - Test search with uninitialized storage
  - Test search with corrupted search index

#### Export Command Tests

- [x] Basic functionality
  - [x] Test JSON format export to stdout
  - [x] Test JSON format export to file
  - [ ] Test export with empty graph
  - [ ] Test export with multiple nodes
- [ ] Error handling
  - [ ] Test export with invalid format
  - [ ] Test export with invalid file path
  - [ ] Test export with insufficient permissions
  - [ ] Test export with uninitialized storage

## Project Status Board

- [x] Set up CLI project structure
- [x] Implement base command structure
- [x] Implement new node command
- [x] Add tests for new command
- [x] Implement search command
- [x] Implement export command
- [x] Add tests for search command
- [ ] Add tests for export command
- [ ] Implement AI functionality
  - [ ] Core interfaces and types
  - [ ] Ollama integration
  - [ ] AI service
  - [ ] Tag generation
  - [ ] CLI integration
  - [ ] Testing
- [ ] Add help text
- [ ] Add error handling
- [ ] Add test coverage

## Executor's Feedback or Assistance Requests

The export command has been successfully implemented and tested manually. The implementation includes:

- Support for both JSON and text formats
- Clear output formatting with proper indentation
- Progress indication during export
- Proper error handling for unsupported formats
- Support for output to file or stdout
- Empty graph handling
- Type-safe metadata handling

Both formats have been tested and work as expected:

- Text format provides a human-readable output with colored sections
- JSON format provides a structured output suitable for programmatic use

The next step is to add automated tests for the export command, covering all major scenarios and error cases.

Current Progress:

- Successfully implemented and tested JSON format export to stdout
- Successfully implemented and tested JSON format export to file
- Next steps:
  1. Implement test for empty graph handling
  2. Implement test for multiple nodes export
  3. Implement error handling tests
  4. Add comprehensive test coverage

## Lessons

Using Commander.js for CLI argument parsing provides a clean, maintainable structure

- Progress indicators (Ora) and colored output (Chalk) improve user experience
- Command aliases make the tool more user-friendly
- Proper error handling with specific error messages improves user experience
- Initializing storage and search index on startup ensures they're ready when needed
- Using explicit flags for file input makes the command behavior more predictable
- Mocking dependencies in tests helps isolate functionality
- Cleaning up test files prevents test pollution
- When testing file system operations, it's important to mock both the file system and path modules
- For console output testing, consider normalizing the output to handle ANSI color codes and newlines

## Review Findings

1. Missing Features:

   - No validation for file size limits
   - No validation for text content length
   - No handling of different file encodings
   - No cleanup of temporary files
   - No handling of concurrent access to the same file

2. Potential Improvements:

   - Add file size limit warning
   - Add content length validation
   - Add support for different file encodings
   - Add proper cleanup of resources
   - Add locking mechanism for concurrent access

3. Security Considerations:

   - Need to validate file paths
   - Need to handle symlinks properly
   - Need to sanitize input content
   - Need to handle file permissions

4. Performance Considerations:
   - Need to monitor memory usage
   - Need to handle large files efficiently
   - Need to optimize search index updates
   - Need to consider caching strategies

## Next Steps Priority

1. Add tests for export command

   - Implement basic functionality tests
   - Implement error handling tests
   - Add test fixtures and mocks
   - Verify test coverage

2. Add input validation and security measures

   - Add file size validation
   - Add content length validation
   - Add file path validation
   - Add permission checks

3. Add help text and documentation

   - Ensure all commands and options have clear help text
   - Add usage examples and edge case notes

4. Add performance optimizations

   - Implement caching
   - Optimize file operations
   - Add memory usage monitoring
   - Add concurrent access handling

5. Review and polish
   - Review code for consistency and maintainability
   - Update documentation and README
   - Prepare for user feedback or beta release
