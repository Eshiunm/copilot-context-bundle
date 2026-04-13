const { CLI_NAME, CLI_VERSION } = require('../constants');

function getGeneralHelp() {
  return `${CLI_NAME} v${CLI_VERSION}

Usage:
  ${CLI_NAME} <command> [options]

Commands:
  install <targetPath>      Install shared assets and an optional profile into a target repo.
  status <targetPath>       Check manifest-backed managed item status.
  promote <targetPath>      Copy one target repo file back into the bundle source repo.
  help [command]            Show command help.
  version                   Show CLI version.

Examples:
  ${CLI_NAME} install ../sandbox --profile storage-manager-fe --dry-run
  ${CLI_NAME} status ../sandbox
  ${CLI_NAME} promote ../sandbox --file .github/instructions/storage-manager-fe.instructions.md --bundle-source .
`;
}

function getInstallHelp() {
  return `Usage:
  ${CLI_NAME} install <targetPath> [options]

Options:
  --profile <name>         Install a single profile in addition to shared assets.
  --target <value>         github | vscode | claude | all (default: all)
  --force                  Overwrite existing files and replace an existing manifest.
  --dry-run                Show planned operations without writing files.
  --bundle-source <path>   Override the bundle source root for local development.
`;
}

function getStatusHelp() {
  return `Usage:
  ${CLI_NAME} status <targetPath> [options]

Options:
  --json                   Output structured JSON summary.
  --fail-on-drift          Exit with a non-zero code when drift or missing items are found.
`;
}

function getPromoteHelp() {
  return `Usage:
  ${CLI_NAME} promote <targetPath> --file <repoRelativePath> [options]

Options:
  --file <repoRelativePath>  Target repo path to promote back into the bundle source repo.
  --to <layer>               shared | profile:<name>
  --bundle-source <path>     Bundle source repo path; recommended for local testing.
  --dry-run                  Show the planned destination without writing files.
  --force                    Overwrite the destination file in the bundle source repo.
`;
}

function getCommandHelp(commandName) {
  switch (commandName) {
    case 'install':
      return getInstallHelp();
    case 'status':
      return getStatusHelp();
    case 'promote':
      return getPromoteHelp();
    default:
      return getGeneralHelp();
  }
}

async function runHelp(commandName) {
  console.log(getCommandHelp(commandName));
  return 0;
}

module.exports = {
  getCommandHelp,
  runHelp
};
