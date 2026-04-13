const { CLI_NAME, CLI_VERSION, EXIT_CODES } = require('./constants');
const { CliError } = require('./args');
const { runHelp } = require('./commands/help');
const { runInstall } = require('./commands/install');
const { runStatus } = require('./commands/status');
const { runPromote } = require('./commands/promote');

async function runCli(argv) {
  if (argv.length === 0) {
    return runHelp();
  }

  const [command, ...rest] = argv;

  if (command === '--help' || command === '-h' || command === 'help') {
    return runHelp(rest[0]);
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(CLI_VERSION);
    return EXIT_CODES.OK;
  }

  if (rest.includes('--help') || rest.includes('-h')) {
    return runHelp(command);
  }

  switch (command) {
    case 'install':
      return runInstall(rest);
    case 'status':
      return runStatus(rest);
    case 'promote':
      return runPromote(rest);
    default:
      throw new CliError(
        `Unknown command: ${command}. Run '${CLI_NAME} --help' to see available commands.`,
        EXIT_CODES.USAGE_ERROR
      );
  }
}

function formatCliError(error) {
  if (error instanceof CliError) {
    return `${CLI_NAME}: ${error.message}`;
  }

  return `${CLI_NAME}: ${error && error.message ? error.message : String(error)}`;
}

module.exports = {
  formatCliError,
  runCli
};
