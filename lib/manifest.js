const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { CliError } = require('./args');
const {
  CHECKSUM_ALGORITHM,
  CLI_NAME,
  CLI_VERSION,
  EXIT_CODES,
  MANIFEST_RELATIVE_PATH,
  MANIFEST_SCHEMA_VERSION
} = require('./constants');
const { fromPosixPath, pathExists } = require('./bundle');

function normalizeRepository(repository) {
  if (!repository) {
    return null;
  }

  if (typeof repository === 'string') {
    return repository;
  }

  if (typeof repository.url === 'string') {
    return repository.url;
  }

  return null;
}

function detectBundleSourceType(bundleRoot) {
  return fs.existsSync(path.join(bundleRoot, '.git')) ? 'local-workspace' : 'npm-package';
}

function readPackageMetadata(bundleRoot) {
  const packageJsonPath = path.join(bundleRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function tryReadGitCommit(bundleRoot) {
  try {
    return execFileSync('git', ['-C', bundleRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

async function buildManifest({ bundleRoot, profile, items, localOverrides = [] }) {
  const sourceType = detectBundleSourceType(bundleRoot);
  const packageMetadata = readPackageMetadata(bundleRoot);

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    bundle: {
      name: packageMetadata?.name || path.basename(bundleRoot),
      sourceType,
      packageName: sourceType === 'npm-package' ? packageMetadata?.name || null : null,
      packageVersion: sourceType === 'npm-package' ? packageMetadata?.version || null : null,
      repository: normalizeRepository(packageMetadata?.repository) || null,
      commit: sourceType === 'local-workspace' ? tryReadGitCommit(bundleRoot) : null
    },
    installer: {
      name: CLI_NAME,
      version: CLI_VERSION
    },
    installedAt: new Date().toISOString(),
    profile: profile || null,
    targets: [...new Set(items.map((item) => item.target))],
    checksumAlgorithm: CHECKSUM_ALGORITHM,
    managedItems: items.map(({ layer, target, sourcePath, targetPath, checksum }) => ({
      layer,
      target,
      sourcePath,
      targetPath,
      checksum
    })),
    localOverrides: [...localOverrides]
  };
}

async function writeManifest(targetRoot, manifest) {
  const manifestPath = path.join(targetRoot, fromPosixPath(MANIFEST_RELATIVE_PATH));
  await fsPromises.mkdir(path.dirname(manifestPath), { recursive: true });
  await fsPromises.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifestPath;
}

function validateManifestShape(manifest) {
  const requiredTopLevelFields = [
    'schemaVersion',
    'bundle',
    'installer',
    'installedAt',
    'profile',
    'targets',
    'checksumAlgorithm',
    'managedItems',
    'localOverrides'
  ];

  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new CliError('Manifest content must be a JSON object.', EXIT_CODES.STATUS_ERROR);
  }

  for (const field of requiredTopLevelFields) {
    if (!(field in manifest)) {
      throw new CliError(`Manifest is missing required field '${field}'.`, EXIT_CODES.STATUS_ERROR);
    }
  }

  if (!Array.isArray(manifest.managedItems)) {
    throw new CliError("Manifest field 'managedItems' must be an array.", EXIT_CODES.STATUS_ERROR);
  }

  if (!Array.isArray(manifest.localOverrides)) {
    throw new CliError("Manifest field 'localOverrides' must be an array.", EXIT_CODES.STATUS_ERROR);
  }

  return manifest;
}

async function readManifest(targetRoot) {
  const manifestPath = path.join(targetRoot, fromPosixPath(MANIFEST_RELATIVE_PATH));
  if (!(await pathExists(manifestPath))) {
    throw new CliError(`Manifest not found at ${manifestPath}.`, EXIT_CODES.STATUS_ERROR);
  }

  let manifest;
  try {
    manifest = JSON.parse(await fsPromises.readFile(manifestPath, 'utf8'));
  } catch (error) {
    throw new CliError(`Failed to read manifest JSON: ${error.message}`, EXIT_CODES.STATUS_ERROR);
  }

  return {
    manifest: validateManifestShape(manifest),
    manifestPath
  };
}

module.exports = {
  buildManifest,
  readManifest,
  validateManifestShape,
  writeManifest
};
