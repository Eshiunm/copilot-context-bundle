const fs = require('node:fs/promises');
const path = require('node:path');

const { CliError } = require('./args');
const { EXIT_CODES, PACKAGE_ROOT, SUPPORTED_TARGETS, TARGET_DIRECTORIES } = require('./constants');

const INSTRUCTIONS_PREFIX = '.github/instructions/';

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function fromPosixPath(filePath) {
  return filePath.split('/').join(path.sep);
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function listFilesRecursive(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolveRequestedTargets(targetOption) {
  if (!targetOption || targetOption === 'all') {
    return [...SUPPORTED_TARGETS];
  }

  if (!SUPPORTED_TARGETS.includes(targetOption)) {
    throw new CliError(
      `Unsupported target '${targetOption}'. Expected one of: all, ${SUPPORTED_TARGETS.join(', ')}`,
      EXIT_CODES.USAGE_ERROR
    );
  }

  return [targetOption];
}

function validateRequestedTargets(requestedTargets) {
  if (!Array.isArray(requestedTargets) || requestedTargets.length === 0) {
    throw new CliError('At least one target must be requested.', EXIT_CODES.USAGE_ERROR);
  }

  const normalizedTargets = [];
  const seen = new Set();

  for (const target of requestedTargets) {
    if (!SUPPORTED_TARGETS.includes(target)) {
      throw new CliError(
        `Unsupported target '${target}'. Expected one of: ${SUPPORTED_TARGETS.join(', ')}`,
        EXIT_CODES.USAGE_ERROR
      );
    }

    if (!seen.has(target)) {
      normalizedTargets.push(target);
      seen.add(target);
    }
  }

  return normalizedTargets;
}

function toTargetAbsolutePath(targetRoot, targetPath) {
  return path.join(targetRoot, fromPosixPath(targetPath));
}

function mapInstructionTargetPath(relativeTargetPath, { layer, profileName }) {
  if (!relativeTargetPath.startsWith(INSTRUCTIONS_PREFIX) || !relativeTargetPath.endsWith('.instructions.md')) {
    return relativeTargetPath;
  }

  const remainder = relativeTargetPath.slice(INSTRUCTIONS_PREFIX.length);

  if (layer === 'shared') {
    return remainder.startsWith('common/')
      ? relativeTargetPath
      : `${INSTRUCTIONS_PREFIX}common/${remainder}`;
  }

  if (layer === 'profile') {
    if (!profileName) {
      throw new CliError('Profile instruction mapping requires a profile name.', EXIT_CODES.USAGE_ERROR);
    }

    return remainder.startsWith(`${profileName}/`)
      ? relativeTargetPath
      : `${INSTRUCTIONS_PREFIX}${profileName}/${remainder}`;
  }

  return relativeTargetPath;
}

function stripInstructionCategoryFromTargetPath(targetPath) {
  if (!targetPath.startsWith(INSTRUCTIONS_PREFIX) || !targetPath.endsWith('.instructions.md')) {
    return targetPath;
  }

  const remainder = targetPath.slice(INSTRUCTIONS_PREFIX.length);
  const segments = remainder.split('/');
  if (segments.length < 2) {
    return targetPath;
  }

  return `${INSTRUCTIONS_PREFIX}${segments.slice(1).join('/')}`;
}

async function resolveBundleRoot(bundleSourcePath) {
  const bundleRoot = path.resolve(bundleSourcePath || PACKAGE_ROOT);
  const sharedRoot = path.join(bundleRoot, 'shared');
  const profilesRoot = path.join(bundleRoot, 'profiles');

  if (!(await isDirectory(sharedRoot)) || !(await isDirectory(profilesRoot))) {
    throw new CliError(
      `Bundle source root is invalid: ${bundleRoot}. Expected 'shared/' and 'profiles/' folders.`,
      EXIT_CODES.USAGE_ERROR
    );
  }

  return bundleRoot;
}

async function collectLayerItems({ bundleRoot, layer, layerRoot, requestedTargets, profileName = null }) {
  const items = [];

  for (const target of requestedTargets) {
    const targetDirectory = TARGET_DIRECTORIES[target];
    const sourceTargetRoot = path.join(layerRoot, targetDirectory);
    if (!(await isDirectory(sourceTargetRoot))) {
      continue;
    }

    const files = await listFilesRecursive(sourceTargetRoot);
    for (const filePath of files) {
      const relativeTargetPath = normalizePath(path.relative(layerRoot, filePath));
      items.push({
        layer,
        target,
        sourcePath: normalizePath(path.relative(bundleRoot, filePath)),
        targetPath: mapInstructionTargetPath(relativeTargetPath, { layer, profileName }),
        sourceAbsolutePath: filePath
      });
    }
  }

  return items;
}

function assertNoDuplicateTargetPaths(items) {
  const seen = new Map();
  for (const item of items) {
    if (seen.has(item.targetPath)) {
      const previous = seen.get(item.targetPath);
      throw new CliError(
        `Target path collision detected between '${previous.sourcePath}' and '${item.sourcePath}'.`,
        EXIT_CODES.CONFLICT
      );
    }

    seen.set(item.targetPath, item);
  }
}

async function buildInstallPlanFromTargets({ bundleRoot, profile, requestedTargets }) {
  const normalizedTargets = validateRequestedTargets(requestedTargets);
  const items = [];
  const sharedRoot = path.join(bundleRoot, 'shared');

  items.push(
    ...(await collectLayerItems({
      bundleRoot,
      layer: 'shared',
      layerRoot: sharedRoot,
      requestedTargets: normalizedTargets
    }))
  );

  if (profile) {
    const profileRoot = path.join(bundleRoot, 'profiles', profile);
    if (!(await isDirectory(profileRoot))) {
      throw new CliError(`Profile '${profile}' does not exist under ${path.join(bundleRoot, 'profiles')}.`, EXIT_CODES.USAGE_ERROR);
    }

    items.push(
      ...(await collectLayerItems({
        bundleRoot,
        layer: 'profile',
        layerRoot: profileRoot,
        requestedTargets: normalizedTargets,
        profileName: profile
      }))
    );
  }

  if (items.length === 0) {
    throw new CliError('No installable files matched the requested target set.', EXIT_CODES.USAGE_ERROR);
  }

  assertNoDuplicateTargetPaths(items);

  return {
    bundleRoot,
    profile: profile || null,
    requestedTargets: normalizedTargets,
    items
  };
}

async function buildInstallPlan({ bundleRoot, profile, targetOption }) {
  const requestedTargets = resolveRequestedTargets(targetOption);
  return buildInstallPlanFromTargets({
    bundleRoot,
    profile,
    requestedTargets
  });
}

module.exports = {
  buildInstallPlan,
  buildInstallPlanFromTargets,
  fromPosixPath,
  isDirectory,
  normalizePath,
  pathExists,
  resolveBundleRoot,
  resolveRequestedTargets,
  stripInstructionCategoryFromTargetPath,
  toTargetAbsolutePath,
  validateRequestedTargets
};
