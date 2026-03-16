# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zbox-cli is a comprehensive command-line utility package that provides tools for file operations, git management, SCP deployment, HTTP services, and multimedia downloading. The package is built using Node.js with the Commander.js framework for CLI functionality.

## Development Commands

### Testing
- `npm test` - Run all Jest tests
- `npm run test:watch` - Run tests in watch mode

### Code Quality
- `npm run lint` - Lint JavaScript files using ESLint
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code using Prettier

### Publishing
- `npm run release` - Run tests and publish to npm

### Local Development
- `npm link` - Link package globally for local testing
- `zbox --help` - Test CLI after linking

## Architecture

### Command Structure
The CLI follows a modular command structure organized by functionality:

- **Main Entry**: `bin/zbox.js` - CLI entry point with Commander.js setup
- **Core Module**: `src/index.js` - Root command definitions and imports
- **Command Modules**:
  - `src/git/` - Git operations (batch commands, QA releases, branch cleanup)
  - `src/file/` - File operations (encryption, downloads, SCP deployment)
  - `src/command/` - Utility commands (HTTP server, device finder, MD5, TOTP)
  - `src/ke/` - Development tools (URL to API code generator)

### Key Architectural Patterns

1. **Commander.js Integration**: Each functional area creates a command group using `program.command()`
2. **Module-based Organization**: Commands are organized into logical modules that are imported by `src/index.js`
3. **Async/Await Pattern**: Most operations use async/await for handling asynchronous operations
4. **Utility Layer**: Common functions are centralized in `src/utils/` for reuse across commands
5. **Configuration-based Operations**: Complex operations (like SCP deployment) use external config files

### Command Registration Pattern
Commands are registered by importing modules that call `program.command()`:
```javascript
// In src/index.js
require('./git');    // Registers git commands
require('./file');   // Registers file commands
require('./ke');     // Registers development tools
```

Each module defines its own command group and subcommands using Commander.js.

### Utility Functions
Core utilities in `src/utils/index.js`:
- `question()` - Interactive prompts using readline
- `spawnExec()` - Cross-platform process spawning with error handling
- `getIps()` - Network interface discovery
- `formatDateTime()` - Date/time formatting

## Key Features by Module

### File Operations (`src/file/`)
- **Encryption/Decryption**: AES-256-CBC with interactive password input
- **Random Renaming**: File obfuscation with base64 encoding and restoration
- **M3U8 Downloads**: Both Node.js native and FFmpeg-based video downloading
- **SCP Deployment**: Incremental file uploads with MD5 change detection
- **Upload Server**: HTTP file upload service with drag-and-drop interface

### Git Operations (`src/git/`)
- **Batch Commands**: Execute git operations across multiple repositories
- **QA Release**: Automated merge workflow (master → current → qa)
- **Branch Cleanup**: Safe deletion of merged local branches

### Development Tools
- **HTTP Server**: Quick development server with custom responses
- **Device Scanner**: Network discovery for services on specific ports
- **MD5 Utility**: Hash calculation with iteration and encoding options
- **TOTP Generator**: Time-based one-time password generation

## Configuration Files

### SCP Deployment
Uses `publishConfig.js` files for deployment configuration:
```javascript
module.exports = {
  host: 'server.com',
  username: 'user',
  password: 'pass', // or privateKey
  remotePath: '/var/www/html',
  localPath: './dist',
  exclude: ['node_modules', '.git', '*.log']
};
```

## Testing Strategy

- **Jest Framework**: Comprehensive unit testing with mocking
- **Command Testing**: Direct function testing with mocked dependencies
- **Input Validation**: Extensive parameter validation testing
- **Known Test Vectors**: Uses standard test cases for cryptographic functions

## Dependencies

### Production Dependencies
- `axios` - HTTP client for API requests
- `commander` - CLI framework
- `formidable` - File upload handling
- `m3u8-parser` - Video playlist parsing

### Development Dependencies
- `eslint` - Code linting
- `jest` - Testing framework
- `prettier` - Code formatting

## Security Considerations

- File encryption uses AES-256-CBC with random IVs
- Password input is handled securely with readline
- SCP operations support both password and key-based authentication
- No sensitive data is logged to console
- Git status validation prevents accidental deployments