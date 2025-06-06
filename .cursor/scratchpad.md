# SpiderBrain CLI Implementation Plan

## Background and Motivation

SpiderBrain is a tool designed to help users manage and navigate through their knowledge base by creating a graph of interconnected nodes. For the MVP, we're focusing on three core commands that provide the essential functionality: creating new nodes, searching the knowledge base, and exporting the graph.

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

- [ ] Basic functionality

  - Test successful search with exact match
  - Test successful search with fuzzy match
  - Test search with multiple results
  - Test search with no results
  - Test search with empty query
  - Test search with limit option

- [ ] Error handling
  - Test search with invalid limit value
  - Test search with uninitialized storage
  - Test search with corrupted search index

#### Export Command Tests

- [ ] Basic functionality

  - Test JSON format export
  - Test text format export
  - Test export with empty graph
  - Test export with multiple nodes
  - Test export to stdout
  - Test export to file

- [ ] Error handling
  - Test export with invalid format
  - Test export with invalid file path
  - Test export with insufficient permissions
  - Test export with uninitialized storage

## Project Status Board

- [x] Set up CLI project structure
- [x] Implement base command structure
- [x] Implement new node command
- [x] Add tests for new command
- [x] Implement search command
- [x] Implement export command
- [ ] Add tests for search command
- [ ] Add tests for export command
- [ ] Add help text
- [ ] Add error handling
- [ ] Add test coverage

## Executor's Feedback or Assistance Requests

The export command has been successfully implemented and tested. The implementation includes:

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

The next step would be to add tests for both the search and export commands.

## Lessons

Using Commander.js for CLI argument parsing provides a clean, maintainable structure

- Progress indicators (Ora) and colored output (Chalk) improve user experience
- Command aliases make the tool more user-friendly
- Proper error handling with specific error messages improves user experience
- Initializing storage and search index on startup ensures they're ready when needed
- Using explicit flags for file input makes the command behavior more predictable
- Mocking dependencies in tests helps isolate functionality
- Cleaning up test files prevents test pollution

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

1. Add tests for search command

   - Implement basic functionality tests
   - Implement error handling tests
   - Add test fixtures and mocks
   - Verify test coverage

2. Add tests for export command

   - Implement basic functionality tests
   - Implement error handling tests
   - Add test fixtures and mocks
   - Verify test coverage

3. Add input validation and security measures

   - Add file size validation
   - Add content length validation
   - Add file path validation
   - Add permission checks

4. Add performance optimizations
   - Implement caching
   - Optimize file operations
   - Add memory usage monitoring
   - Add concurrent access handling
