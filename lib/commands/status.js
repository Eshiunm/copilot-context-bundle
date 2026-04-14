const path = require('node:path');

const { parseArgs, requireSinglePositional } = require('../args');
const { EXIT_CODES, MANIFEST_RELATIVE_PATH } = require('../constants');
const { fromPosixPath, pathExists } = require('../bundle');
const { sha256File } = require('../checksum');
const { readManifest } = require('../manifest');

const STATUS_ARG_SCHEMA = {
  aliases: {
    '-h': '--help'
  },
  options: {
    '--help': { name: 'help', type: 'boolean' },
    '--detail': { name: 'detail', type: 'boolean' },
    '--json': { name: 'json', type: 'boolean' },
    '--fail-on-drift': { name: 'failOnDrift', type: 'boolean' }
  }
};

function printItemPaths(items) {
  if (items.length === 0) {
    console.log('  - (none)');
    return;
  }

  for (const item of items) {
    console.log(`  - ${item.targetPath}`);
  }
}

async function runStatus(argv) {
  const { options, positionals } = parseArgs(argv, STATUS_ARG_SCHEMA);
  const targetPathInput = requireSinglePositional(positionals, 'targetPath');
  const targetRoot = path.resolve(targetPathInput);
  const { manifest, manifestPath } = await readManifest(targetRoot);

  const itemResults = [];
  for (const item of manifest.managedItems) {
    const targetAbsolutePath = path.join(targetRoot, fromPosixPath(item.targetPath));
    const exists = await pathExists(targetAbsolutePath);

    if (!exists) {
      itemResults.push({ ...item, state: 'missing' });
      continue;
    }

    const checksum = await sha256File(targetAbsolutePath);
    itemResults.push({
      ...item,
      state: checksum === item.checksum ? 'ok' : 'modified',
      currentChecksum: checksum
    });
  }

  const modifiedItems = itemResults.filter((item) => item.state === 'modified');
  const missingItems = itemResults.filter((item) => item.state === 'missing');

  const summary = {
    manifestPath,
    bundle: manifest.bundle.name,
    profile: manifest.profile,
    managedItems: itemResults.length,
    ok: itemResults.length - modifiedItems.length - missingItems.length,
    modified: modifiedItems.length,
    missing: missingItems.length,
    localOverrides: manifest.localOverrides,
    items: itemResults
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else if (options.detail) {
    console.log(`Profile: ${summary.profile || 'shared-only'}`);
    console.log(`Managed items: ${summary.managedItems}`);
    printItemPaths(itemResults);
    console.log(`Modified: ${summary.modified}`);
    printItemPaths(modifiedItems);
    console.log(`Missing: ${summary.missing}`);
    printItemPaths(missingItems);
  } else {
    console.log(`Profile: ${summary.profile || 'shared-only'}`);
    console.log(`Managed items: ${summary.managedItems}`);
    console.log(`Modified: ${summary.modified}`);
    console.log(`Missing: ${summary.missing}`);

    if (manifest.localOverrides.length > 0) {
      console.log(`Local overrides: ${manifest.localOverrides.length}`);
    }

    return options.failOnDrift && (summary.modified > 0 || summary.missing > 0)
      ? EXIT_CODES.STATUS_ERROR
      : EXIT_CODES.OK;
  }

  if (manifest.localOverrides.length > 0) {
    console.log(`Local overrides: ${manifest.localOverrides.length}`);
  }

  if (options.failOnDrift && (summary.modified > 0 || summary.missing > 0)) {
    return EXIT_CODES.STATUS_ERROR;
  }

  return EXIT_CODES.OK;
}

module.exports = {
  runStatus
};
