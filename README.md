# zbox-cli

[![npm version](https://badge.fury.io/js/zbox-cli.svg)](https://www.npmjs.com/package/zbox-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A collection of utility tools for file encryption/decryption, batch git operations, and more.

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

### Available Commands

#### File Encryption/Decryption

**Encrypt files:**
```bash
zbox encrypt -i /path/to/input -o /path/to/output -p your_password
```

**Decrypt files:**
```bash
zbox decrypt -i /path/to/encrypted -o /path/to/output -p your_password
```

Options:
- `-i, --input <path>` - Input directory or file pattern
- `-o, --output <path>` - Output directory
- `-p, --password <password>` - Encryption/decryption password

#### Batch Git Operations

**Execute git commands across multiple repositories:**
```bash
zbox git -d ./repo1 ./repo2 ./repo3 -c "status"
zbox git -d ./projects/* -c "pull origin main"
```

Options:
- `-d, --dirs <dirs...>` - Directories to operate on
- `-c, --command <command>` - Git command to execute

#### QA Release Tool

**Merge current branch to QA branch:**
```bash
zbox qa
zbox qa -b staging -m master
```

Options:
- `-b, --branch <branch>` - Target branch (default: qa)
- `-m, --master <master>` - Master branch name (default: master)

## Examples

### Batch encrypt files
```bash
# Encrypt all .txt files in a directory
zbox encrypt -i "documents/*.txt" -o encrypted_docs -p mypassword123

# Encrypt entire directory
zbox encrypt -i /path/to/sensitive_data -o /path/to/encrypted -p mypassword123
```

### Batch git operations
```bash
# Check status of all repositories in projects folder
zbox git -d ./projects/* -c "status"

# Pull latest changes from main branch for multiple repos
zbox git -d ./repo1 ./repo2 ./repo3 -c "pull origin main"

# Add and commit changes across repositories
zbox git -d ./projects/* -c "add . && git commit -m 'Update'"
```

### QA Release workflow
```bash
# Standard QA release (merge current branch to qa)
zbox qa

# Custom branch names
zbox qa -b staging -m develop
```

## Features

- 🔐 **File Encryption**: Batch encrypt/decrypt files using AES-256-CBC
- 🔄 **Git Operations**: Execute git commands across multiple repositories
- 🚀 **QA Release**: Streamlined branch merging for QA workflows
- 📁 **Pattern Matching**: Support for glob patterns in file operations
- ⚡ **Parallel Processing**: Efficient batch operations
- 🛡️ **Error Handling**: Comprehensive error reporting

## API

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
```

## Requirements

- Node.js >= 20
- npm >= 6

## Development

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd zBox
npm install
```

### Scripts

- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run release` - Publish to npm

### Testing locally

You can test the CLI locally by linking the package:

```bash
npm link
zbox --help
```

## Security

- File encryption uses AES-256-CBC with randomly generated IVs
- Passwords are processed using scrypt for key derivation
- No passwords or sensitive data are logged

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

### v0.1.0-beta.2
- Initial release
- File encryption/decryption utilities
- Batch git operations
- QA release workflow tool

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/zbox-cli/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## Roadmap

- [ ] Add progress bars for long operations
- [ ] Support for different encryption algorithms
- [ ] Configuration file support
- [ ] More git workflow templates
- [ ] File compression utilities
- [ ] Integration with popular CI/CD platforms

---

Made with ❤️ for developers who love automation