#!/usr/bin/env node

const { runCli, formatCliError } = require('../lib/cli');

runCli(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(formatCliError(error));
    process.exitCode = typeof error.exitCode === 'number' ? error.exitCode : 1;
  });
