# zbox-cli

[![npm version](https://badge.fury.io/js/zbox-cli.svg)](https://www.npmjs.com/package/zbox-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`zbox-cli` 是一个基于 Node.js 的命令行工具集，提供文件处理、加解密、Git 工作流、网络服务、文件部署和开发辅助等功能。

## Installation

```bash
npm install -g zbox-cli
```

## Usage

安装后可通过 `zbox` 使用工具，并通过帮助命令查看当前版本支持的命令：

```bash
zbox --help
```

## 可用的命令

### 通用命令

| 命令 | 功能 |
| --- | --- |
| `zbox update` | 更新 `zbox-cli`，支持指定安装方式和 npm 源。 |
| `zbox qrcode` | 将文本内容生成二维码图片。 |
| `zbox md5` | 计算文本或文件的 MD5，支持迭代、截取长度和 Base64 输出。 |

### 文件操作

| 命令 | 功能                                   |
| --- |--------------------------------------|
| `zbox file repairMediaTime` | 根据图片或视频中的拍摄时间修复文件创建时间和修改时间。          |
| `zbox file xor` | 使用循环异或密钥处理文件或目录，可通过再次执行还原内容。         |
| `zbox file rr` | 随机重命名目录中的文件，并支持恢复原文件名。               |
| `zbox file en` | 加密文件或目录。                             |
| `zbox file de` | 解密文件或目录。                             |
| `zbox file nodejsDownloadM3u8` | 使用 Node.js 下载并合并 M3U8 视频。            |
| `zbox file ffmpegDownloadM3u8` | 使用 FFmpeg 下载 M3U8 视频，支持批量和并发任务。      |
| `zbox file scp` | 通过 SCP 将文件增量上传到服务器，并可在上传前检查 Git 状态。  |
| `zbox file upload` | 启动文件上传服务，支持上传文件和文件夹。                 |
| `zbox file md5` | 计算文件 MD5，支持处理超大文件。                   |
| `zbox file videoMerge` | 合并指定目录中的视频文件。                        |
| `zbox file classify` | 按文件数量和大小限制，将目录中的文件分类到多个子目录，支持多种排序方式。 |

### Git 操作

| 命令 | 功能 |
| --- | --- |
| `zbox git qa` | 执行 QA 发布流程，将主分支合并到当前分支，再将当前分支合并到 QA 分支。 |
| `zbox git deleteBranch` | 安全删除已经合并到主分支的本地分支。 |
| `zbox git mr` | 查找多个项目中的同名分支，并创建 GitLab Merge Request。 |

### 网络服务

| 命令 | 功能 |
| --- | --- |
| `zbox net http` | 启动可自定义端口和响应内容的 Node.js HTTP 服务。 |
| `zbox net text` | 启动临时文本保存和访问服务。 |
| `zbox net scanDevice` | 扫描局域网设备及指定端口的服务。 |

### 文本与密码工具

| 命令 | 功能 |
| --- | --- |
| `zbox crypto generatePassword` | 根据主密码、网站和用户信息生成可重复计算的确定性密码。 |
| `zbox crypto encrypt` | 使用密钥加密字符串。 |
| `zbox crypto decrypt` | 使用密钥解密字符串。 |
| `zbox crypto totp` | 根据密钥生成 TOTP 动态验证码。 |

### 本地扩展命令

| 命令 | 功能 |
| --- | --- |
| `zbox local add` | 添加包含本地自定义命令的文件或目录。 |
| `zbox local delete` | 从配置中删除本地命令文件或目录。 |
| `zbox local list` | 列出已配置的本地命令路径及其中包含的命令。 |
| `zbox local cmdLoadErrMsg` | 查看本地命令文件的加载错误。 |

`zbox local` 会动态加载用户配置的命令文件，因此实际可用的本地扩展命令以 `zbox local --help` 的输出为准。

## Features

- 文件加密、解密、异或处理、随机重命名和分类整理
- 图片与视频时间修复、视频合并和 M3U8 下载
- 文件上传服务与 SCP 增量部署
- Git QA 发布、分支清理和 GitLab Merge Request 创建
- HTTP 服务、临时文本服务和局域网设备扫描
- 二维码、MD5、字符串加解密、确定性密码和 TOTP 工具
- 支持加载个人 JavaScript 文件扩展本地命令

## Requirements

- Node.js >= 20
- npm
- 部分功能需要安装 FFmpeg

## Configuration

SCP 部署通过 `publishConfig.js` 配置服务器信息、本地目录、远程目录和排除规则，可用 `zbox file scp -p` 查看配置示例。

## Development

```bash
git clone https://github.com/1061186575/zbox-cli
cd zBox
npm install
```

### Scripts

- `npm test`：运行 Jest 测试
- `npm run test:watch`：以监听模式运行测试
- `npm run lint`：检查 JavaScript 代码
- `npm run lint:fix`：自动修复可处理的代码问题
- `npm run format`：使用 Prettier 格式化代码
- `npm run release`：执行发布流程

### Local Development

```bash
npm link
zbox --help
```

## Security

- 文件加密使用 AES-256-CBC 和随机 IV
- 密码通过 scrypt 派生加密密钥
- 密码和敏感信息不会输出到控制台
- SCP 支持密码和私钥认证

## Contributing

1. Fork 本仓库
2. 创建功能分支
3. 提交代码变更
4. 推送功能分支
5. 创建 Pull Request

## License

本项目基于 MIT License 发布，详情请查看 [LICENSE](LICENSE)。

## Changelog

版本变更请查看 Git 提交记录和 npm 发布记录。

## Support

如遇到问题，请在项目的 Issues 页面提交问题，并附上错误信息和复现步骤。
