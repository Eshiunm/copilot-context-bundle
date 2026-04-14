const path = require('node:path');
const packageJson = require('../package.json');

const CLI_NAME = 'copilot-bundle';
const CLI_VERSION = packageJson.version || '0.2.0';
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const MANIFEST_RELATIVE_PATH = '.copilot-bundle/manifest.json';
const MANIFEST_SCHEMA_VERSION = '0.1.0';
const CHECKSUM_ALGORITHM = 'sha256';
const SUPPORTED_TARGETS = ['github', 'vscode', 'claude'];
const TARGET_DIRECTORIES = {
  github: '.github',
  vscode: '.vscode',
  claude: '.claude'
};
const EXIT_CODES = {
  OK: 0,
  GENERAL_ERROR: 1,
  USAGE_ERROR: 2,
  STATUS_ERROR: 3,
  CONFLICT: 4
};

module.exports = {
  CHECKSUM_ALGORITHM,
  CLI_NAME,
  CLI_VERSION,
  EXIT_CODES,
  MANIFEST_RELATIVE_PATH,
  MANIFEST_SCHEMA_VERSION,
  PACKAGE_ROOT,
  SUPPORTED_TARGETS,
  TARGET_DIRECTORIES
};
