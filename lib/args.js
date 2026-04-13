const { EXIT_CODES } = require('./constants');

class CliError extends Error {
  constructor(message, exitCode = EXIT_CODES.GENERAL_ERROR) {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}

function parseArgs(argv, schema = {}) {
  const optionDefinitions = schema.options || {};
  const aliases = schema.aliases || {};
  const positionals = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (!token.startsWith('-') || token === '-') {
      positionals.push(token);
      continue;
    }

    const aliasExpanded = aliases[token] || token;
    const [flag, inlineValue] = aliasExpanded.split(/=(.*)/s, 2);
    const definition = optionDefinitions[flag];

    if (!definition) {
      throw new CliError(`Unknown option: ${token}`, EXIT_CODES.USAGE_ERROR);
    }

    if (definition.type === 'boolean') {
      options[definition.name] = true;
      continue;
    }

    const value = inlineValue !== undefined ? inlineValue : argv[index + 1];
    if (value === undefined) {
      throw new CliError(`Option ${token} requires a value.`, EXIT_CODES.USAGE_ERROR);
    }

    if (inlineValue === undefined) {
      index += 1;
    }

    options[definition.name] = value;
  }

  return { options, positionals };
}

function requireSinglePositional(positionals, label = 'targetPath') {
  if (positionals.length === 0) {
    throw new CliError(`Missing required argument: ${label}`, EXIT_CODES.USAGE_ERROR);
  }

  if (positionals.length > 1) {
    throw new CliError(`Unexpected extra arguments: ${positionals.slice(1).join(' ')}`, EXIT_CODES.USAGE_ERROR);
  }

  return positionals[0];
}

module.exports = {
  CliError,
  parseArgs,
  requireSinglePositional
};
