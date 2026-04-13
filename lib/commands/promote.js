const fs = require('node:fs/promises');
const path = require('node:path');

const { CliError, parseArgs, requireSinglePositional } = require('../args');
const { sha256File } = require('../checksum');
const { EXIT_CODES, PACKAGE_ROOT } = require('../constants');
const { fromPosixPath, normalizePath, pathExists, resolveBundleRoot } = require('../bundle');
const { readManifest, writeManifest } = require('../manifest');

const PROMOTE_ARG_SCHEMA = {
  aliases: {
    '-h': '--help'
  },
  options: {
    '--help': { name: 'help', type: 'boolean' },
    '--file': { name: 'file', type: 'string' },
    '--to': { name: 'to', type: 'string' },
    '--bundle-source': { name: 'bundleSource', type: 'string' },
    '--dry-run': { name: 'dryRun', type: 'boolean' },
    '--force': { name: 'force', type: 'boolean' }
  }
};

function parseDestinationOverride(destination, repoRelativePath) {
  if (destination === 'shared') {
    return `shared/${repoRelativePath}`;
  }

  if (destination && destination.startsWith('profile:')) {
    const profileName = destination.slice('profile:'.length).trim();
    if (!profileName) {
      throw new CliError("'--to profile:<name>' requires a non-empty profile name.", EXIT_CODES.USAGE_ERROR);
    }

    return `profiles/${profileName}/${repoRelativePath}`;
  }

  throw new CliError("'--to' must be 'shared' or 'profile:<name>'.", EXIT_CODES.USAGE_ERROR);
}

function inferLayerFromSourcePath(sourcePath) {
  if (sourcePath.startsWith('shared/')) {
    return 'shared';
  }

  if (sourcePath.startsWith('profiles/')) {
    return 'profile';
  }

  throw new CliError(
    `Unable to infer manifest layer from source path '${sourcePath}'.`,
    EXIT_CODES.STATUS_ERROR
  );
}

async function resolvePromotionBundleRoot(bundleSourceOption) {
  if (bundleSourceOption) {
    return resolveBundleRoot(bundleSourceOption);
  }

  const defaultRoot = await resolveBundleRoot(PACKAGE_ROOT);
  if (await pathExists(path.join(defaultRoot, '.git'))) {
    return defaultRoot;
  }

  throw new CliError(
    'Promote requires --bundle-source when not running from the bundle source repository.',
    EXIT_CODES.USAGE_ERROR
  );
}

async function runPromote(argv) {
  const { options, positionals } = parseArgs(argv, PROMOTE_ARG_SCHEMA);
  const targetPathInput = requireSinglePositional(positionals, 'targetPath');
  const targetRoot = path.resolve(targetPathInput);

  if (!options.file) {
    throw new CliError("Missing required option '--file <repoRelativePath>'.", EXIT_CODES.USAGE_ERROR);
  }

  const repoRelativePath = normalizePath(options.file);
  const targetAbsolutePath = path.join(targetRoot, fromPosixPath(repoRelativePath));
  if (!(await pathExists(targetAbsolutePath))) {
    throw new CliError(`Target file does not exist: ${targetAbsolutePath}`, EXIT_CODES.STATUS_ERROR);
  }

  const { manifest } = await readManifest(targetRoot);
  const managedItem = manifest.managedItems.find((item) => item.targetPath === repoRelativePath);

  let destinationRelativePath;
  if (options.to) {
    destinationRelativePath = parseDestinationOverride(options.to, repoRelativePath);
  } else if (managedItem) {
    destinationRelativePath = managedItem.sourcePath;
  } else {
    throw new CliError(
      `File '${repoRelativePath}' is not a managed item. Use --to shared or --to profile:<name> to promote it.`,
      EXIT_CODES.USAGE_ERROR
    );
  }

  const bundleRoot = await resolvePromotionBundleRoot(options.bundleSource);
  const destinationAbsolutePath = path.join(bundleRoot, fromPosixPath(destinationRelativePath));
  const destinationExists = await pathExists(destinationAbsolutePath);

  if (options.dryRun) {
    console.log(`Dry-run promote from ${repoRelativePath}`);
    console.log(`Bundle source: ${bundleRoot}`);
    console.log(`Destination: ${destinationRelativePath}`);
    if (destinationExists) {
      console.log('Destination already exists. Use --force to overwrite during actual promote.');
      return EXIT_CODES.CONFLICT;
    }
    return EXIT_CODES.OK;
  }

  if (destinationExists && !options.force) {
    throw new CliError(
      `Destination already exists: ${destinationAbsolutePath}. Re-run with --force to overwrite it.`,
      EXIT_CODES.CONFLICT
    );
  }

  await fs.mkdir(path.dirname(destinationAbsolutePath), { recursive: true });
  await fs.copyFile(targetAbsolutePath, destinationAbsolutePath);

  const promotedChecksum = await sha256File(targetAbsolutePath);

  if (managedItem) {
    managedItem.sourcePath = destinationRelativePath;
    managedItem.layer = inferLayerFromSourcePath(destinationRelativePath);
    managedItem.checksum = promotedChecksum;
  }

  const existingOverrideIndex = manifest.localOverrides.findIndex(
    (entry) => entry.targetPath === repoRelativePath && entry.reason === 'promoted'
  );
  const promotedOverride = {
    targetPath: repoRelativePath,
    reason: 'promoted',
    recordedAt: new Date().toISOString()
  };

  if (existingOverrideIndex >= 0) {
    manifest.localOverrides[existingOverrideIndex] = promotedOverride;
  } else {
    manifest.localOverrides.push(promotedOverride);
  }

  await writeManifest(targetRoot, manifest);

  console.log(`Promoted ${repoRelativePath}`);
  console.log(`Bundle source destination: ${destinationAbsolutePath}`);
  console.log('Next steps: review the bundle source diff, commit it, then re-run install/update where needed.');

  return EXIT_CODES.OK;
}

module.exports = {
  runPromote
};
