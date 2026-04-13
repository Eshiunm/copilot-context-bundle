const fs = require('node:fs/promises');
const path = require('node:path');

const { parseArgs, requireSinglePositional } = require('../args');
const {
  buildInstallPlanFromTargets,
  pathExists,
  resolveBundleRoot,
  toTargetAbsolutePath
} = require('../bundle');
const { EXIT_CODES } = require('../constants');
const { sha256File } = require('../checksum');
const { buildManifest, readManifest, writeManifest } = require('../manifest');

const UPDATE_ARG_SCHEMA = {
  aliases: {
    '-h': '--help'
  },
  options: {
    '--help': { name: 'help', type: 'boolean' },
    '--bundle-source': { name: 'bundleSource', type: 'string' },
    '--dry-run': { name: 'dryRun', type: 'boolean' },
    '--force': { name: 'force', type: 'boolean' },
    '--prune': { name: 'prune', type: 'boolean' },
    '--json': { name: 'json', type: 'boolean' }
  }
};

function indexByTargetPath(items) {
  return new Map(items.map((item) => [item.targetPath, item]));
}

function groupOverridesByTargetPath(localOverrides) {
  const grouped = new Map();

  for (const entry of localOverrides) {
    const existingEntries = grouped.get(entry.targetPath) || [];
    existingEntries.push(entry);
    grouped.set(entry.targetPath, existingEntries);
  }

  return grouped;
}

function getProtectedOverride(overrideEntries) {
  return (overrideEntries || []).find(
    (entry) => entry.reason === 'keep-local' || entry.reason === 'user-owned'
  ) || null;
}

function toSerializableEntry(entry) {
  const fields = [
    'type',
    'targetPath',
    'sourcePath',
    'previousSourcePath',
    'reason',
    'message',
    'copyRequired'
  ];

  return fields.reduce((result, field) => {
    if (entry[field] !== undefined) {
      result[field] = entry[field];
    }

    return result;
  }, {});
}

function summarizePlan(plan) {
  return {
    updated: plan.refresh.length,
    added: plan.add.length,
    restored: plan.restore.length,
    pruned: plan.prune.length,
    reconciled: plan.reconcile.length,
    unchanged: plan.unchanged.length,
    conflicts: plan.conflicts.length
  };
}

function buildJsonReport(plan, manifestPath) {
  return {
    manifestPath,
    bundleRoot: plan.bundleRoot,
    profile: plan.profile,
    targets: plan.targets,
    summary: plan.summary,
    refresh: plan.refresh.map(toSerializableEntry),
    add: plan.add.map(toSerializableEntry),
    restore: plan.restore.map(toSerializableEntry),
    reconcile: plan.reconcile.map(toSerializableEntry),
    removed: plan.removed.map(toSerializableEntry),
    prune: plan.prune.map(toSerializableEntry),
    conflicts: plan.conflicts.map(toSerializableEntry)
  };
}

function printTextReport(plan, manifestPath, { dryRun }) {
  if (dryRun) {
    console.log(`Dry-run update for ${plan.targetRoot}`);
  } else {
    console.log(`Updated bundle-managed files in ${plan.targetRoot}`);
  }

  console.log(`Manifest: ${manifestPath}`);
  console.log(`Bundle source: ${plan.bundleRoot}`);
  console.log(`Profile: ${plan.profile || 'shared-only'}`);
  console.log(`Targets: ${plan.targets.join(', ')}`);
  console.log(`Updated: ${plan.summary.updated}`);
  console.log(`Added: ${plan.summary.added}`);
  console.log(`Restored: ${plan.summary.restored}`);
  console.log(`Pruned: ${plan.summary.pruned}`);
  if (plan.summary.reconciled > 0) {
    console.log(`Reconciled: ${plan.summary.reconciled}`);
  }
  console.log(`Conflicts: ${plan.summary.conflicts}`);

  if (plan.refresh.length > 0) {
    console.log('Updated items:');
    for (const entry of plan.refresh) {
      console.log(`  ${entry.targetPath} <- ${entry.sourcePath} (${entry.reason})`);
    }
  }

  if (plan.add.length > 0) {
    console.log('Added items:');
    for (const entry of plan.add) {
      console.log(`  ${entry.targetPath} <- ${entry.sourcePath} (${entry.reason})`);
    }
  }

  if (plan.restore.length > 0) {
    console.log('Restored items:');
    for (const entry of plan.restore) {
      console.log(`  ${entry.targetPath} <- ${entry.sourcePath}`);
    }
  }

  if (plan.reconcile.length > 0) {
    console.log('Reconciled items:');
    for (const entry of plan.reconcile) {
      const previousSource = entry.previousSourcePath ? `${entry.previousSourcePath} -> ` : '';
      console.log(`  ${entry.targetPath} (${previousSource}${entry.sourcePath}; ${entry.reason})`);
    }
  }

  if (plan.removed.length > 0 && plan.prune.length === 0) {
    console.log('Pending prune items (re-run with --prune to remove them):');
    for (const entry of plan.removed) {
      console.log(`  ${entry.targetPath} (was ${entry.previousSourcePath})`);
    }
  }

  if (plan.prune.length > 0) {
    console.log('Pruned items:');
    for (const entry of plan.prune) {
      console.log(`  ${entry.targetPath} (was ${entry.previousSourcePath})`);
    }
  }

  if (plan.conflicts.length > 0) {
    console.log('Conflicts:');
    for (const entry of plan.conflicts) {
      console.log(`  [${entry.type}] ${entry.targetPath}: ${entry.message}`);
    }
  }
}

function printPlan(plan, manifestPath, options) {
  if (options.json) {
    console.log(JSON.stringify(buildJsonReport(plan, manifestPath), null, 2));
  } else {
    printTextReport(plan, manifestPath, options);
  }
}

async function loadUpdateContext(targetRoot, options) {
  const bundleRoot = await resolveBundleRoot(options.bundleSource);
  const { manifest, manifestPath } = await readManifest(targetRoot);
  const nextInstallPlan = await buildInstallPlanFromTargets({
    bundleRoot,
    profile: manifest.profile || null,
    requestedTargets: manifest.targets
  });

  const nextInstallItems = await Promise.all(
    nextInstallPlan.items.map(async (item) => ({
      ...item,
      checksum: await sha256File(item.sourceAbsolutePath)
    }))
  );

  return {
    targetRoot,
    bundleRoot,
    manifest,
    manifestPath,
    nextInstallItems,
    currentManagedItemsByTargetPath: indexByTargetPath(manifest.managedItems),
    nextManagedItemsByTargetPath: indexByTargetPath(nextInstallItems),
    overridesByTargetPath: groupOverridesByTargetPath(manifest.localOverrides)
  };
}

async function readTargetFileInfo(targetAbsolutePath) {
  const exists = await pathExists(targetAbsolutePath);
  if (!exists) {
    return {
      exists: false,
      checksum: null
    };
  }

  return {
    exists: true,
    checksum: await sha256File(targetAbsolutePath)
  };
}

function createOperationEntry({ targetPath, targetAbsolutePath, nextItem, currentItem, reason, copyRequired }) {
  return {
    targetPath,
    targetAbsolutePath,
    sourcePath: nextItem ? nextItem.sourcePath : undefined,
    sourceAbsolutePath: nextItem ? nextItem.sourceAbsolutePath : undefined,
    previousSourcePath: currentItem ? currentItem.sourcePath : undefined,
    reason,
    copyRequired
  };
}

function createConflict({ type, targetPath, message, nextItem, currentItem }) {
  return {
    type,
    targetPath,
    sourcePath: nextItem ? nextItem.sourcePath : undefined,
    previousSourcePath: currentItem ? currentItem.sourcePath : undefined,
    message
  };
}

async function buildUpdatePlan(context, options) {
  const targetPaths = new Set([
    ...context.currentManagedItemsByTargetPath.keys(),
    ...context.nextManagedItemsByTargetPath.keys()
  ]);

  const plan = {
    targetRoot: context.targetRoot,
    bundleRoot: context.bundleRoot,
    manifestPath: context.manifestPath,
    profile: context.manifest.profile,
    targets: context.manifest.targets,
    nextInstallItems: context.nextInstallItems,
    refresh: [],
    add: [],
    restore: [],
    reconcile: [],
    unchanged: [],
    removed: [],
    prune: [],
    conflicts: [],
    preservedLocalOverrides: []
  };

  for (const targetPath of [...targetPaths].sort()) {
    const currentItem = context.currentManagedItemsByTargetPath.get(targetPath) || null;
    const nextItem = context.nextManagedItemsByTargetPath.get(targetPath) || null;
    const overrideEntries = context.overridesByTargetPath.get(targetPath) || [];
    const protectedOverride = getProtectedOverride(overrideEntries);
    const targetAbsolutePath = toTargetAbsolutePath(context.targetRoot, targetPath);
    const targetFile = await readTargetFileInfo(targetAbsolutePath);

    if (currentItem && nextItem) {
      const metadataChanged =
        currentItem.layer !== nextItem.layer ||
        currentItem.target !== nextItem.target ||
        currentItem.sourcePath !== nextItem.sourcePath ||
        currentItem.checksum !== nextItem.checksum;

      if (!targetFile.exists) {
        if (protectedOverride && !options.force) {
          plan.conflicts.push(
            createConflict({
              type: 'protected-override',
              targetPath,
              currentItem,
              nextItem,
              message: `Path is protected by local override '${protectedOverride.reason}' and requires --force to restore.`
            })
          );
          continue;
        }

        plan.restore.push(
          createOperationEntry({
            targetPath,
            targetAbsolutePath,
            nextItem,
            currentItem,
            reason: 'missing-managed-item',
            copyRequired: true
          })
        );
        continue;
      }

      const targetMatchesManifest = targetFile.checksum === currentItem.checksum;
      const targetMatchesNext = targetFile.checksum === nextItem.checksum;

      if (!targetMatchesManifest) {
        if (!options.force) {
          plan.conflicts.push(
            createConflict({
              type: 'drift',
              targetPath,
              currentItem,
              nextItem,
              message: 'Managed item has local drift; re-run with --force to overwrite or adopt it.'
            })
          );
          continue;
        }

        if (!targetMatchesNext) {
          plan.refresh.push(
            createOperationEntry({
              targetPath,
              targetAbsolutePath,
              nextItem,
              currentItem,
              reason: 'force-overwrite-drifted-item',
              copyRequired: true
            })
          );
          continue;
        }

        plan.reconcile.push(
          createOperationEntry({
            targetPath,
            targetAbsolutePath,
            nextItem,
            currentItem,
            reason: metadataChanged ? 'force-adopt-current-content-and-refresh-manifest' : 'force-adopt-current-content',
            copyRequired: false
          })
        );
        continue;
      }

      if (currentItem.checksum !== nextItem.checksum) {
        if (protectedOverride && !options.force) {
          plan.conflicts.push(
            createConflict({
              type: 'protected-override',
              targetPath,
              currentItem,
              nextItem,
              message: `Path is protected by local override '${protectedOverride.reason}' and requires --force to update.`
            })
          );
          continue;
        }

        plan.refresh.push(
          createOperationEntry({
            targetPath,
            targetAbsolutePath,
            nextItem,
            currentItem,
            reason: 'bundle-source-changed',
            copyRequired: true
          })
        );
        continue;
      }

      if (metadataChanged) {
        plan.reconcile.push(
          createOperationEntry({
            targetPath,
            targetAbsolutePath,
            nextItem,
            currentItem,
            reason: 'manifest-metadata-updated',
            copyRequired: false
          })
        );
        continue;
      }

      plan.unchanged.push(
        createOperationEntry({
          targetPath,
          targetAbsolutePath,
          nextItem,
          currentItem,
          reason: 'already-up-to-date',
          copyRequired: false
        })
      );
      continue;
    }

    if (!currentItem && nextItem) {
      if (targetFile.exists) {
        if (protectedOverride && !options.force) {
          plan.conflicts.push(
            createConflict({
              type: 'protected-override',
              targetPath,
              nextItem,
              message: `Path is protected by local override '${protectedOverride.reason}' and requires --force to adopt it as managed.`
            })
          );
          continue;
        }

        if (!options.force) {
          plan.conflicts.push(
            createConflict({
              type: 'collision',
              targetPath,
              nextItem,
              message: 'Target path already exists outside manifest management; re-run with --force to adopt it.'
            })
          );
          continue;
        }
      }

      plan.add.push(
        createOperationEntry({
          targetPath,
          targetAbsolutePath,
          nextItem,
          reason: targetFile.exists ? 'force-adopt-existing-target-path' : 'new-managed-item',
          copyRequired: !targetFile.exists || targetFile.checksum !== nextItem.checksum
        })
      );
      continue;
    }

    if (currentItem && !nextItem) {
      const removedEntry = createOperationEntry({
        targetPath,
        targetAbsolutePath,
        currentItem,
        reason: 'removed-from-bundle-source',
        copyRequired: false
      });
      plan.removed.push(removedEntry);

      if (options.prune) {
        plan.prune.push(removedEntry);
      } else {
        plan.conflicts.push(
          createConflict({
            type: 'prune-required',
            targetPath,
            currentItem,
            message: 'Managed item no longer exists in the bundle source; re-run with --prune to remove it.'
          })
        );
      }
    }
  }

  const finalManagedTargetPaths = new Set(context.nextInstallItems.map((item) => item.targetPath));
  plan.preservedLocalOverrides = context.manifest.localOverrides.filter((entry) => finalManagedTargetPaths.has(entry.targetPath));
  plan.summary = summarizePlan(plan);

  return plan;
}

async function applyCopyOperations(entries) {
  for (const entry of entries) {
    if (!entry.copyRequired) {
      continue;
    }

    await fs.mkdir(path.dirname(entry.targetAbsolutePath), { recursive: true });
    await fs.copyFile(entry.sourceAbsolutePath, entry.targetAbsolutePath);
  }
}

async function applyPruneOperations(entries) {
  for (const entry of entries) {
    if (await pathExists(entry.targetAbsolutePath)) {
      await fs.rm(entry.targetAbsolutePath, { force: true });
    }
  }
}

async function applyUpdatePlan(plan) {
  await applyCopyOperations(plan.refresh);
  await applyCopyOperations(plan.add);
  await applyCopyOperations(plan.restore);
  await applyPruneOperations(plan.prune);

  const manifest = await buildManifest({
    bundleRoot: plan.bundleRoot,
    profile: plan.profile,
    items: plan.nextInstallItems,
    localOverrides: plan.preservedLocalOverrides
  });
  const manifestPath = await writeManifest(plan.targetRoot, manifest);

  return {
    manifestPath
  };
}

async function runUpdate(argv) {
  const { options, positionals } = parseArgs(argv, UPDATE_ARG_SCHEMA);
  const targetPathInput = requireSinglePositional(positionals, 'targetPath');
  const targetRoot = path.resolve(targetPathInput);

  const context = await loadUpdateContext(targetRoot, options);
  const plan = await buildUpdatePlan(context, options);

  if (options.dryRun) {
    printPlan(plan, context.manifestPath, options);
    return plan.conflicts.length > 0 ? EXIT_CODES.CONFLICT : EXIT_CODES.OK;
  }

  if (plan.conflicts.length > 0) {
    printPlan(plan, context.manifestPath, options);
    return EXIT_CODES.CONFLICT;
  }

  const { manifestPath } = await applyUpdatePlan(plan);
  printPlan(plan, manifestPath, options);
  return EXIT_CODES.OK;
}

module.exports = {
  runUpdate
};
