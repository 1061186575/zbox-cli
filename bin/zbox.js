#!/usr/bin/env node

const { program } = require('commander');
const pkg = require('../package.json');

program
  .name('zbox')
  .description('A collection of utility tools for file/git operations, and more')
  .version(pkg.version);

require('../src/index')


program.parse(process.argv);

// Display help by default if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
