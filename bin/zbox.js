#!/usr/bin/env node

const pkg = require('../package.json');
const { warnIfUnsupportedNodeVersion } = require('../src/utils/nodeVersion');
const { program } = require('commander');

warnIfUnsupportedNodeVersion(process.versions.node, pkg.engines && pkg.engines.node);

// node ./bin/zbox -h
// npx zbox -h
// alias lz='node /Users/ke/project/zBox/bin/zbox.js'

program
  .name('zbox')
  .description('A collection of utility tools for file/git operations, and more')
  .version(pkg.version);

require('../src/index');


program.parse(process.argv);

// Display help by default if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
