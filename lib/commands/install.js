const fs = require('node:fs/promises');
const path = require('node:path');

const { CliError, parseArgs, requireSinglePositional } = require('../args');
const { pathExists, buildInstallPlan, fromPosixPath, resolveBundleRoot } = require('../bundle');
const { EXIT_CODES, MANIFEST_RELATIVE_PATH } = require('../constants');
const { sha256File } = require('../checksum');
const { buildManifest, readManifest, writeManifest } = require('../manifest');

const INSTALL_ARG_SCHEMA = {
  aliases: {
    '-h': '--help'
  },
  options: {
    '--help': { name: 'help', type: 'boolean' },
    '--profile': { name: 'profile', type: 'string' },
    '--target': { name: 'target', type: 'string' },
    '--force': { name: 'force', type: 'boolean' },
    '--dry-run': { name: 'dryRun', type: 'boolean' },
    '--bundle-source': { name: 'bundleSource', type: 'string' }
  }
};

function buildTargetAbsolutePath(targetRoot, targetPath) {
  return path.join(targetRoot, fromPosixPath(targetPath));
}

async function tryReadExistingManifest(targetRoot) {
  try {
    const { manifest } = await readManifest(targetRoot);
    return manifest;
  } catch {
    return null;
  }
}

async function removeEmptyParentDirectories(startDirectory, stopDirectory) {
  let currentDirectory = path.resolve(startDirectory);
  const normalizedStopDirectory = path.resolve(stopDirectory);

  while (currentDirectory !== normalizedStopDirectory) {
    try {
      await fs.rmdir(currentDirectory);
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTEMPTY')) {
        return;
      }

      throw error;
    }

    currentDirectory = path.dirname(currentDirectory);
  }
}

async function pruneReplacedManagedItems(targetRoot, existingManifest, nextItems) {
  if (!existingManifest) {
    return;
  }

  const nextTargetPaths = new Set(nextItems.map((item) => item.targetPath));

  for (const item of existingManifest.managedItems) {
    if (nextTargetPaths.has(item.targetPath)) {
      continue;
    }

    const targetAbsolutePath = buildTargetAbsolutePath(targetRoot, item.targetPath);
    if (await pathExists(targetAbsolutePath)) {
      await fs.rm(targetAbsolutePath, { force: true });
      await removeEmptyParentDirectories(path.dirname(targetAbsolutePath), targetRoot);
    }
  }
}

async function detectConflicts(targetRoot, items) {
  const conflicts = [];
  for (const item of items) {
    const targetAbsolutePath = buildTargetAbsolutePath(targetRoot, item.targetPath);
    if (await pathExists(targetAbsolutePath)) {
      conflicts.push({
        sourcePath: item.sourcePath,
        targetPath: item.targetPath,
        targetAbsolutePath
      });
    }
  }

  return conflicts;
}

function printDryRun(targetRoot, plan, conflicts, manifestExists) {
  console.log(`Dry-run install to ${targetRoot}`);
  console.log(`Profile: ${plan.profile || 'shared-only'}`);
  console.log(`Targets: ${plan.requestedTargets.join(', ')}`);
  console.log(`Managed items: ${plan.items.length}`);

  for (const item of plan.items) {
    console.log(`  ${item.sourcePath} -> ${item.targetPath}`);
  }

  if (manifestExists) {
    console.log(`Manifest already exists at ${path.join(targetRoot, fromPosixPath(MANIFEST_RELATIVE_PATH))}`);
  }

  if (conflicts.length > 0) {
    console.log('Conflicts:');
    for (const conflict of conflicts) {
      console.log(`  ${conflict.targetPath}`);
    }
  }
}

async function runInstall(argv) {
  const { options, positionals } = parseArgs(argv, INSTALL_ARG_SCHEMA);
  const targetPathInput = requireSinglePositional(positionals, 'targetPath');
  const targetRoot = path.resolve(targetPathInput);
  const bundleRoot = await resolveBundleRoot(options.bundleSource);
  const plan = await buildInstallPlan({
    bundleRoot,
    profile: options.profile || null,
    targetOption: options.target || 'all'
  });

  const manifestAbsolutePath = path.join(targetRoot, fromPosixPath(MANIFEST_RELATIVE_PATH));
  const manifestExists = await pathExists(manifestAbsolutePath);
  const existingManifest = manifestExists ? await tryReadExistingManifest(targetRoot) : null;
  const conflicts = await detectConflicts(targetRoot, plan.items);

  if (options.dryRun) {
    printDryRun(targetRoot, plan, conflicts, manifestExists);
    return manifestExists || conflicts.length > 0 ? EXIT_CODES.CONFLICT : EXIT_CODES.OK;
  }

  if (manifestExists && !options.force) {
    throw new CliError(
      `Manifest already exists at ${manifestAbsolutePath}. Re-run with --force to replace it.`,
      EXIT_CODES.CONFLICT
    );
  }

  if (conflicts.length > 0 && !options.force) {
    throw new CliError(
      `Found ${conflicts.length} existing target file(s). Re-run with --force to overwrite them.`,
      EXIT_CODES.CONFLICT
    );
  }

  const installedItems = [];
  for (const item of plan.items) {
    const targetAbsolutePath = buildTargetAbsolutePath(targetRoot, item.targetPath);
    await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
    await fs.copyFile(item.sourceAbsolutePath, targetAbsolutePath);
    installedItems.push({
      ...item,
      checksum: await sha256File(targetAbsolutePath)
    });
  }

  if (options.force && existingManifest) {
    await pruneReplacedManagedItems(targetRoot, existingManifest, plan.items);
  }

  const manifest = await buildManifest({
    bundleRoot,
    profile: plan.profile,
    items: installedItems
  });
  const manifestPath = await writeManifest(targetRoot, manifest);

  console.log(`Installed ${plan.profile ? `shared + profile '${plan.profile}'` : 'shared'} to ${targetRoot}`);
  console.log(`Managed items: ${installedItems.length}`);
  console.log(`Manifest: ${manifestPath}`);

  return EXIT_CODES.OK;
}

module.exports = {
  runInstall
};
