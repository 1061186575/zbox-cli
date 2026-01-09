# zbox-cli

[![npm version](https://badge.fury.io/js/zbox-cli.svg)](https://www.npmjs.com/package/zbox-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive collection of utility tools for file operations, Git management, SCP deployment, HTTP services, and multimedia downloading.

## Installation

Install globally via npm:

```bash
npm install -g zbox-cli
```

## Usage

After installation, you can use the `zbox` command from anywhere in your terminal:

```bash
zbox --help
```

## Available Commands

### File Operations

#### File Encryption/Decryption

**Encrypt files or directories:**
```bash
zbox file en /path/to/input -o /path/to/output
zbox file en document.txt --overwrite
zbox file en ./folder -e .enc --no-recursive
```

**Decrypt files or directories:**
```bash
zbox file de /path/to/encrypted.encrypted -o /path/to/output
zbox file de ./encrypted_folder --overwrite
```

Options:
- `-o, --output <path>` - Output path (default: original path with .encrypted extension)
- `-e, --extension <ext>` - Encrypted file extension (default: .encrypted)
- `--no-recursive` - Don't process subdirectories recursively
- `--overwrite` - Overwrite existing files

#### Random File Renaming

**Rename files randomly with ability to restore:**
```bash
zbox file rr -p ./files -a 1  # Rename files
zbox file rr -p ./files -a 2  # Restore original names
zbox file rr -p ./files -a 1 --base64 --ext  # Rename with base64 encoding and preserve extensions
```

Options:
- `-p, --path <path>` - Target directory path
- `-a, --action <action>` - Action (1: rename, 2: restore)
- `-r, --recordFileName <recordFileName>` - Custom record file name
- `-b, --base64` - Apply base64 encoding/decoding to file contents
- `--ext` - Preserve file extensions

#### M3U8 Video Download

**Download using Node.js (built-in):**
```bash
zbox file nodejsDownloadM3u8
```

**Download using FFmpeg:**
```bash
# Single file download
zbox file ffmpegDownloadM3u8 -u "https://example.com/video.m3u8" -s "output.mp4"

# Batch download from file
zbox file ffmpegDownloadM3u8 -i input_list.txt --saveDir ./downloads

# Print input file template
zbox file ffmpegDownloadM3u8 -p
```

Options:
- `-u, --url <url>` - M3U8 file URL
- `-s, --saveFilename <saveFilename>` - Output filename
- `-i, --inputFile <inputFile>` - Input file for batch download
- `--saveDir <saveDir>` - Download directory (default: ffmpegDownloadOutput)
- `--ffmpegFile <ffmpegFile>` - Custom FFmpeg executable path
- `--maxConcurrentTasks <maxConcurrentTasks>` - Max concurrent downloads (default: 3)
- `-p, --printInputFileTemplate` - Show input file format

### Git Operations

#### Batch Git Operations

**Execute git commands across multiple repositories:**
```bash
zbox git -d ./repo1 ./repo2 ./repo3 -c "status"
zbox git -d ./projects/* -c "pull origin main"
zbox git -d ./projects/* -c "add . && git commit -m 'Batch update'"
```

Options:
- `-d, --dirs <dirs...>` - Directories to operate on
- `-c, --command <command>` - Git command to execute

#### QA Release Tool

**Merge current branch to QA branch:**
```bash
zbox qa
zbox qa -b staging -m develop
```

Options:
- `-b, --branch <branch>` - Target branch (default: qa)
- `-m, --master <master>` - Master branch name (default: master)

#### Cleanup Local Branches

**Delete merged local branches:**
```bash
zbox deleteMergedLocalBranches
```

### Deployment & Server Operations

#### SCP File Upload

**Deploy files to remote servers with incremental upload:**
```bash
# Use default config
zbox scp

# Use custom config with git check
zbox scp -c ./my-config.js -g

# Print configuration template
zbox scp -p
```

Options:
- `-c, --config <configPath>` - Configuration file path (default: ./publishConfig.js)
- `-g, --gitCommitCheck` - Check git commit status before upload
- `-p, --printDemoConfig` - Print configuration template

#### HTTP Server

**Start a local HTTP server:**
```bash
# Default server on port 3000
zbox http

# Custom port
zbox http -p 8080

# Custom response
zbox http -p 3000 -s "Hello World"
```

Options:
- `-p, --port <port>` - Port number (default: 3000)
- `-s, --response <response>` - Custom response body

### Development Tools

#### URL to API Code Generator

```bash
zbox ke url2ApiCode
```

## Examples

### File Operations

```bash
# Encrypt sensitive documents
zbox file en ./documents -o ./secure_docs

# Download video playlist
zbox file ffmpegDownloadM3u8 -u "https://example.com/playlist.m3u8" -s "movie.mp4"

# Batch rename files for privacy
zbox file rr -p ./photos -a 1 --base64
```

### Git Workflows

```bash
# Check status across multiple projects
zbox git -d ./project1 ./project2 -c "status"

# Pull latest changes for all repositories
zbox git -d ./projects/* -c "pull origin main"

# Release to QA environment
zbox qa -b qa -m main
```

### Deployment

```bash
# Deploy with git status check
zbox scp -c ./deploy-config.js -g

# Start development server
zbox http -p 8080
```

## Features

- 🔐 **File Security**: AES-256-CBC encryption with random file renaming
- 📹 **Media Download**: M3U8 video downloading with Node.js and FFmpeg support
- 🔄 **Git Management**: Batch operations and automated QA release workflows
- 🚀 **Deployment**: SCP-based incremental file uploads with git integration
- 🌐 **HTTP Server**: Quick development server with custom responses
- 📁 **File Operations**: Pattern matching, batch processing, and content encoding
- ⚡ **Performance**: Parallel processing and concurrent downloads
- 🛡️ **Safety**: Comprehensive error handling and git status validation

## API Usage

You can also use zbox-cli programmatically in your Node.js projects:

```javascript
const { fileUtils, gitUtils } = require('zbox-cli');

// File encryption
await fileUtils.encryptFiles(inputPath, outputPath, password);

// Git operations
const results = await gitUtils.batchGitCommand(
  ['./repo1', './repo2'],
  'status',
  { parallel: true }
);

// SCP deployment
const scpUtils = require('zbox-cli/src/command/scp');
await scpUtils.deploy('./publishConfig.js', true);
```

## Requirements

- Node.js >= 20
- npm >= 6
- FFmpeg (for M3U8 downloads with ffmpeg option)
- SCP access (for deployment features)

## Configuration

### SCP Deploy Configuration

Create a `publishConfig.js` file:

```javascript
module.exports = {
  host: 'your-server.com',
  username: 'deploy-user',
  password: 'your-password', // or use privateKey
  remotePath: '/var/www/html',
  localPath: './dist',
  exclude: ['node_modules', '.git', '*.log']
};
```


## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/1061186575/zbox-cli
cd zBox
npm install
```

### Scripts

- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run release` - Publish to npm

### Testing locally

```bash
npm link
zbox --help
```

## Security

- File encryption uses AES-256-CBC with randomly generated IVs
- Passwords are processed using scrypt for key derivation
- No passwords or sensitive data are logged
- SCP connections support both password and key-based authentication
- Git status validation prevents accidental deployments

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0
- File encryption/decryption utilities
- Random file renaming with base64 encoding support
- M3U8 video downloading (Node.js and FFmpeg)
- Batch git operations and QA release workflows
- SCP deployment with incremental uploads
- HTTP development server
- Git branch cleanup utilities

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/1061186575/zbox-cli/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

Made with ❤️ for developers who love automation and efficiency
