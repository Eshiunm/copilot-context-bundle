const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const packageJson = require('../package.json');

const repoRoot = path.resolve(__dirname, '..');
const cliPath = path.join(repoRoot, 'bin', 'copilot-bundle.js');
const sharedRoot = path.join(repoRoot, 'shared');
const profilesRoot = path.join(repoRoot, 'profiles');
const packageJsonPath = path.join(repoRoot, 'package.json');

function normalizeOutput(value) {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function runCli(args, options = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 0,
    stdout: normalizeOutput(result.stdout),
    stderr: normalizeOutput(result.stderr)
  };
}

function assertExitCode(result, expectedStatus, label) {
  assert.equal(
    result.status,
    expectedStatus,
    `${label} returned ${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
  );
}

async function createSandbox() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'copilot-bundle-test-'));
  const bundleRoot = path.join(tempRoot, 'bundle');
  const targetRoot = path.join(tempRoot, 'target');

  await fs.mkdir(bundleRoot, { recursive: true });
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.cp(sharedRoot, path.join(bundleRoot, 'shared'), { recursive: true });
  await fs.cp(profilesRoot, path.join(bundleRoot, 'profiles'), { recursive: true });
  await fs.copyFile(packageJsonPath, path.join(bundleRoot, 'package.json'));

  return {
    tempRoot,
    bundleRoot,
    targetRoot
  };
}

async function cleanupSandbox(tempRoot) {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

async function installProfile(targetRoot, bundleRoot, profile = 'storage-manager-fe') {
  const result = runCli(['install', targetRoot, '--profile', profile, '--bundle-source', bundleRoot]);
  assertExitCode(result, 0, 'install');
  return result;
}

async function readManifest(targetRoot) {
  const manifestPath = path.join(targetRoot, '.copilot-bundle', 'manifest.json');
  return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

async function appendText(filePath, content) {
  await fs.appendFile(filePath, content, 'utf8');
}

test('help and version commands return success', async () => {
  const helpResult = runCli(['--help']);
  assertExitCode(helpResult, 0, 'help');
  assert.match(helpResult.stdout, /install <targetPath>/);
  assert.match(helpResult.stdout, /update <targetPath>/);
  assert.match(helpResult.stdout, /promote <targetPath>/);

  const statusHelpResult = runCli(['help', 'status']);
  assertExitCode(statusHelpResult, 0, 'help status');
  assert.match(statusHelpResult.stdout, /--detail/);

  const versionResult = runCli(['--version']);
  assertExitCode(versionResult, 0, 'version');
  assert.equal(versionResult.stdout, packageJson.version);
});

test('install creates managed files and status reports a clean manifest', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const manifest = await readManifest(sandbox.targetRoot);
  assert.equal(manifest.profile, 'storage-manager-fe');
  assert.ok(manifest.managedItems.length >= 6);

  await fs.access(path.join(sandbox.targetRoot, '.github', 'copilot-instructions.md'));
  await fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'common', 'copilot-context-bundle-operations.instructions.md'));
  await fs.access(path.join(sandbox.targetRoot, '.vscode', 'mcp.json'));
  await fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'storage-manager-fe.instructions.md'));

  const statusResult = runCli(['status', sandbox.targetRoot]);
  assertExitCode(statusResult, 0, 'status after install');
  assert.equal(statusResult.stdout.includes('Bundle:'), false);
  assert.equal(statusResult.stdout.includes('OK:'), false);
  assert.equal(statusResult.stdout.includes('Manifest:'), false);
  assert.equal(statusResult.stdout.includes(sandbox.targetRoot), false);
  assert.match(statusResult.stdout, new RegExp(`Managed items: ${manifest.managedItems.length}`));
  assert.equal(/\n\s+- /.test(statusResult.stdout), false);
  assert.match(statusResult.stdout, /Modified: 0/);
  assert.match(statusResult.stdout, /Missing: 0/);

  const detailStatusResult = runCli(['status', sandbox.targetRoot, '--detail']);
  assertExitCode(detailStatusResult, 0, 'status detail after install');
  assert.equal(detailStatusResult.stdout.includes('Bundle:'), false);
  assert.equal(detailStatusResult.stdout.includes('OK:'), false);
  assert.equal(detailStatusResult.stdout.includes('Manifest:'), false);
  assert.equal(detailStatusResult.stdout.includes(sandbox.targetRoot), false);
  assert.match(detailStatusResult.stdout, new RegExp(`Managed items: ${manifest.managedItems.length}`));
  assert.match(detailStatusResult.stdout, /  - \.github\/instructions\/common\/copilot-context-bundle-operations\.instructions\.md/);
  assert.match(detailStatusResult.stdout, /Modified: 0\n  - \(none\)/);
  assert.match(detailStatusResult.stdout, /Missing: 0\n  - \(none\)/);

  const jsonStatusResult = runCli(['status', sandbox.targetRoot, '--json']);
  assertExitCode(jsonStatusResult, 0, 'status json after install');
  const jsonStatus = JSON.parse(jsonStatusResult.stdout);
  assert.match(jsonStatus.manifestPath.replace(/\\/g, '/'), /\/\.copilot-bundle\/manifest\.json$/);
});

test('status detail lists modified and missing managed paths with relative target paths', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const manifest = await readManifest(sandbox.targetRoot);
  const modifiedTarget = path.join(sandbox.targetRoot, '.github', 'copilot-instructions.md');
  const missingTarget = path.join(sandbox.targetRoot, '.vscode', 'mcp.json');

  await appendText(modifiedTarget, '\n# status drift\n');
  await fs.rm(missingTarget, { force: true });

  const summaryStatusResult = runCli(['status', sandbox.targetRoot]);
  assertExitCode(summaryStatusResult, 0, 'status summary with modified and missing items');
  assert.equal(summaryStatusResult.stdout.includes('Bundle:'), false);
  assert.equal(summaryStatusResult.stdout.includes('OK:'), false);
  assert.equal(summaryStatusResult.stdout.includes(sandbox.targetRoot), false);
  assert.match(summaryStatusResult.stdout, new RegExp(`Managed items: ${manifest.managedItems.length}`));
  assert.match(summaryStatusResult.stdout, /Modified: 1/);
  assert.match(summaryStatusResult.stdout, /Missing: 1/);
  assert.equal(/\n\s+- /.test(summaryStatusResult.stdout), false);

  const detailStatusResult = runCli(['status', sandbox.targetRoot, '--detail']);
  assertExitCode(detailStatusResult, 0, 'status detail with modified and missing items');
  assert.equal(detailStatusResult.stdout.includes('Bundle:'), false);
  assert.equal(detailStatusResult.stdout.includes('OK:'), false);
  assert.equal(detailStatusResult.stdout.includes(sandbox.targetRoot), false);
  assert.match(detailStatusResult.stdout, new RegExp(`Managed items: ${manifest.managedItems.length}`));
  assert.match(detailStatusResult.stdout, /  - \.github\/instructions\/common\/copilot-context-bundle-operations\.instructions\.md/);
  assert.match(detailStatusResult.stdout, /Modified: 1\n  - \.github\/copilot-instructions\.md/);
  assert.match(detailStatusResult.stdout, /Missing: 1\n  - \.vscode\/mcp\.json/);
});

test('install with force can switch profile and prune stale managed files', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const forceInstallResult = runCli([
    'install',
    sandbox.targetRoot,
    '--profile',
    'nasx86',
    '--bundle-source',
    sandbox.bundleRoot,
    '--force'
  ]);
  assertExitCode(forceInstallResult, 0, 'force install with profile switch');

  const manifest = await readManifest(sandbox.targetRoot);
  assert.equal(manifest.profile, 'nasx86');
  assert.ok(
    manifest.managedItems.every((item) => !item.targetPath.includes('/storage-manager-fe/')),
    `manifest still references storage-manager-fe items: ${JSON.stringify(manifest.managedItems, null, 2)}`
  );

  await fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'nasx86', 'nasx86.instructions.md'));
  await assert.rejects(
    fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'storage-manager-fe.instructions.md'))
  );
  await assert.rejects(
    fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'frontend-ui.instructions.md'))
  );

  const statusResult = runCli(['status', sandbox.targetRoot]);
  assertExitCode(statusResult, 0, 'status after profile switch');
  assert.match(statusResult.stdout, /Profile: nasx86/);
  assert.match(statusResult.stdout, /Modified: 0/);
  assert.match(statusResult.stdout, /Missing: 0/);
});

test('update refreshes, adds, restores, and prunes managed items', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);
  const manifestBefore = await readManifest(sandbox.targetRoot);

  const refreshSource = path.join(
    sandbox.bundleRoot,
    'profiles',
    'storage-manager-fe',
    '.github',
    'instructions',
    'storage-manager-fe.instructions.md'
  );
  const addedSource = path.join(
    sandbox.bundleRoot,
    'profiles',
    'storage-manager-fe',
    '.github',
    'instructions',
    'update-added.instructions.md'
  );
  const restoredTarget = path.join(sandbox.targetRoot, '.vscode', 'mcp.json');

  await appendText(refreshSource, '\n# update refresh test\n');
  await writeText(addedSource, '# update added test\n');
  await fs.rm(restoredTarget, { force: true });

  const dryRunResult = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot, '--dry-run']);
  assertExitCode(dryRunResult, 0, 'update dry-run');
  assert.equal(dryRunResult.stdout.includes('Manifest:'), false);
  assert.match(dryRunResult.stdout, /Updated: 1/);
  assert.match(dryRunResult.stdout, /Added: 1/);
  assert.match(dryRunResult.stdout, /Restored: 1/);
  assert.match(dryRunResult.stdout, /Conflicts: 0/);

  const updateResult = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot]);
  assertExitCode(updateResult, 0, 'update apply');
  assert.equal(updateResult.stdout.includes('Manifest:'), false);
  assert.match(updateResult.stdout, /Updated: 1/);
  assert.match(updateResult.stdout, /Added: 1/);
  assert.match(updateResult.stdout, /Restored: 1/);

  const manifestAfterUpdate = await readManifest(sandbox.targetRoot);
  assert.equal(manifestAfterUpdate.managedItems.length, manifestBefore.managedItems.length + 1);
  assert.match(
    await readText(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'storage-manager-fe.instructions.md')),
    /update refresh test/
  );
  await fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'update-added.instructions.md'));
  await fs.access(restoredTarget);

  const cleanStatus = runCli(['status', sandbox.targetRoot]);
  assertExitCode(cleanStatus, 0, 'status after update');
  assert.match(cleanStatus.stdout, /Modified: 0/);
  assert.match(cleanStatus.stdout, /Missing: 0/);

  await fs.rm(addedSource, { force: true });

  const pruneBlocked = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot]);
  assertExitCode(pruneBlocked, 4, 'update without prune after source removal');
  assert.match(pruneBlocked.stdout, /prune-required/);

  const pruneApplied = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot, '--prune']);
  assertExitCode(pruneApplied, 0, 'update with prune');
  assert.match(pruneApplied.stdout, /Pruned: 1/);

  await assert.rejects(
    fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'update-added.instructions.md'))
  );

  const manifestAfterPrune = await readManifest(sandbox.targetRoot);
  assert.equal(manifestAfterPrune.managedItems.length, manifestBefore.managedItems.length);

  const finalStatus = runCli(['status', sandbox.targetRoot]);
  assertExitCode(finalStatus, 0, 'status after prune');
  assert.match(finalStatus.stdout, /Modified: 0/);
  assert.match(finalStatus.stdout, /Missing: 0/);
});

test('update blocks drift unless forced', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const driftedTarget = path.join(sandbox.targetRoot, '.github', 'copilot-instructions.md');
  await appendText(driftedTarget, '\n# local drift\n');

  const blockedUpdate = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot]);
  assertExitCode(blockedUpdate, 4, 'update drift protection');
  assert.match(blockedUpdate.stdout, /Managed item has local drift/);

  const forcedUpdate = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot, '--force']);
  assertExitCode(forcedUpdate, 0, 'update with force');
  assert.match(forcedUpdate.stdout, /Updated: 1/);

  const finalStatus = runCli(['status', sandbox.targetRoot]);
  assertExitCode(finalStatus, 0, 'status after forced update');
  assert.match(finalStatus.stdout, /Modified: 0/);
  assert.match(finalStatus.stdout, /Missing: 0/);
});

test('update migrates instruction category paths with add plus prune when source layer changes', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const previousSource = path.join(
    sandbox.bundleRoot,
    'profiles',
    'storage-manager-fe',
    '.github',
    'instructions',
    'frontend-ui.instructions.md'
  );
  const sharedSource = path.join(
    sandbox.bundleRoot,
    'shared',
    '.github',
    'instructions',
    'frontend-ui.instructions.md'
  );

  await fs.mkdir(path.dirname(sharedSource), { recursive: true });
  await fs.copyFile(previousSource, sharedSource);
  await fs.rm(previousSource, { force: true });

  const dryRunResult = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot, '--dry-run']);
  assertExitCode(dryRunResult, 4, 'update relocation dry-run');
  assert.match(dryRunResult.stdout, /Added: 1/);
  assert.match(dryRunResult.stdout, /Conflicts: 1/);
  assert.match(dryRunResult.stdout, /prune-required/);

  const updateResult = runCli(['update', sandbox.targetRoot, '--bundle-source', sandbox.bundleRoot, '--prune']);
  assertExitCode(updateResult, 0, 'update relocation apply');
  assert.match(updateResult.stdout, /Added: 1/);
  assert.match(updateResult.stdout, /Pruned: 1/);

  const manifest = await readManifest(sandbox.targetRoot);
  const relocatedItem = manifest.managedItems.find(
    (item) => item.targetPath === '.github/instructions/common/frontend-ui.instructions.md'
  );
  assert.ok(relocatedItem);
  assert.equal(relocatedItem.sourcePath, 'shared/.github/instructions/frontend-ui.instructions.md');
  assert.equal(relocatedItem.layer, 'shared');
  await fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'common', 'frontend-ui.instructions.md'));
  await assert.rejects(
    fs.access(path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'frontend-ui.instructions.md'))
  );

  const finalStatus = runCli(['status', sandbox.targetRoot]);
  assertExitCode(finalStatus, 0, 'status after relocation update');
  assert.match(finalStatus.stdout, /Modified: 0/);
  assert.match(finalStatus.stdout, /Missing: 0/);
});

test('promote writes managed changes back to the bundle source and resets target baseline', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const repoRelativePath = '.github/instructions/storage-manager-fe/storage-manager-fe.instructions.md';
  const targetFile = path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'storage-manager-fe.instructions.md');
  const sourceFile = path.join(
    sandbox.bundleRoot,
    'profiles',
    'storage-manager-fe',
    '.github',
    'instructions',
    'storage-manager-fe.instructions.md'
  );

  await appendText(targetFile, '\n# promoted from target\n');

  const promoteResult = runCli([
    'promote',
    sandbox.targetRoot,
    '--file',
    repoRelativePath,
    '--bundle-source',
    sandbox.bundleRoot,
    '--force'
  ]);
  assertExitCode(promoteResult, 0, 'promote managed file');

  assert.match(await readText(sourceFile), /promoted from target/);

  const manifest = await readManifest(sandbox.targetRoot);
  assert.ok(
    manifest.localOverrides.some((entry) => entry.targetPath === repoRelativePath && entry.reason === 'promoted')
  );

  const finalStatus = runCli(['status', sandbox.targetRoot]);
  assertExitCode(finalStatus, 0, 'status after promote baseline reset');
  assert.match(finalStatus.stdout, /Modified: 0/);
  assert.match(finalStatus.stdout, /Missing: 0/);
});

test('promote can relocate a managed file to shared and remove the stale source', async (t) => {
  const sandbox = await createSandbox();
  t.after(() => cleanupSandbox(sandbox.tempRoot));

  await installProfile(sandbox.targetRoot, sandbox.bundleRoot);

  const repoRelativePath = '.github/instructions/storage-manager-fe/frontend-ui.instructions.md';
  const targetFile = path.join(sandbox.targetRoot, '.github', 'instructions', 'storage-manager-fe', 'frontend-ui.instructions.md');
  const previousSource = path.join(
    sandbox.bundleRoot,
    'profiles',
    'storage-manager-fe',
    '.github',
    'instructions',
    'frontend-ui.instructions.md'
  );
  const sharedSource = path.join(sandbox.bundleRoot, 'shared', '.github', 'instructions', 'frontend-ui.instructions.md');

  await appendText(targetFile, '\n# promote to shared\n');

  const promoteResult = runCli([
    'promote',
    sandbox.targetRoot,
    '--file',
    repoRelativePath,
    '--to',
    'shared',
    '--bundle-source',
    sandbox.bundleRoot,
    '--force'
  ]);
  assertExitCode(promoteResult, 0, 'promote to shared');

  await fs.access(sharedSource);
  await assert.rejects(fs.access(previousSource));
  assert.match(await readText(sharedSource), /promote to shared/);

  const statusAfterPromote = runCli(['status', sandbox.targetRoot]);
  assertExitCode(statusAfterPromote, 0, 'status after promote relocate');
  assert.match(statusAfterPromote.stdout, /Modified: 0/);
  assert.match(statusAfterPromote.stdout, /Missing: 0/);

  const freshTarget = path.join(sandbox.tempRoot, 'fresh-target');
  await fs.mkdir(freshTarget, { recursive: true });
  const freshInstall = runCli(['install', freshTarget, '--profile', 'storage-manager-fe', '--bundle-source', sandbox.bundleRoot]);
  assertExitCode(freshInstall, 0, 'fresh install after promote relocate');

  const freshManifest = await readManifest(freshTarget);
  const relocatedItem = freshManifest.managedItems.find(
    (item) => item.targetPath === '.github/instructions/common/frontend-ui.instructions.md'
  );
  assert.ok(relocatedItem);
  assert.equal(relocatedItem.sourcePath, 'shared/.github/instructions/frontend-ui.instructions.md');
  assert.equal(relocatedItem.layer, 'shared');
  await fs.access(path.join(freshTarget, '.github', 'instructions', 'common', 'frontend-ui.instructions.md'));
});
