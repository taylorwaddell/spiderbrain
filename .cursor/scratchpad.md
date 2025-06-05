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

- [ ] `spiderbrain export [--format json|text]` or `spiderbrain -e [--format json|text]`
  - Success: Can export entire graph
  - Success: Supports different output formats
  - Success: Shows clear export confirmation
  - Success: Handles empty graph gracefully

## Project Status Board

- [x] Set up CLI project structure
- [x] Implement base command structure
- [x] Implement new node command
- [x] Add tests for new command
- [x] Implement search command
- [ ] Implement export command
- [ ] Add help text
- [ ] Add error handling
- [ ] Add test coverage

## Executor's Feedback or Assistance Requests

Tests for the new command have been implemented with:

- Tests for direct text input
- Tests for file input
- Tests for custom title
- Tests for error handling
- Tests for search index integration
- Proper mocking of dependencies
- Cleanup of test files

The tests cover:

1. Creating a node from direct text input
2. Creating a node from file input
3. Creating a node with custom title
4. Handling file not found errors
5. Verifying search index updates

Next steps:

1. Implement the search command
2. Add tests for the search command
3. Implement the export command

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

1. Add basic tests for the new command
2. Implement the search command
3. Add input validation and security measures
4. Implement the export command
5. Add performance optimizations
