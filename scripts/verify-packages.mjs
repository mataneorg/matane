#!/usr/bin/env node
// Proves that @matane/extension-{sdk,runtime,templates,cli} work as published packages, without publishing anything:
//
//   1. `pnpm pack` each package (its `prepack` builds it) and check the tarball: only intended files, a manifest
//      with no `workspace:` ranges, and every export target present.
//   2. Install the four tarballs into an empty project (everything else comes from the registry or the pnpm
//      store), import every entry point and type-check against the declarations.
//   3. In that project run `mr-ext create`, `build`, `repo keygen`, `repo build` and `repo verify` on a scaffolded
//      extension (the bundle must carry the zip and crypto code), and type-check the scaffold.
//   4. `npm publish --dry-run` per package when npm is installed (it lists files; it never uploads).
//
// Run with `pnpm verify:packages`. Needs network only for the registry reads of the third-party dependencies.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SCOPE = '@matane';
// Build order: a package is compiled against the dist of the ones before it.
const PACKAGES = ['extension-sdk', 'extension-runtime', 'extension-templates', 'extension-cli'];
const ALLOWED_FILE = /^package\/(package\.json|README\.md|LICENSE|dist\/.+|bin\/.+)$/;
// The builds ship source maps with the sources inlined (tsconfig.build.json), so `dist/*.js.map` is intended.
const STRAY_FILE = /(^|\/)(src|test|tests|__tests__)\/|\.(test|spec)\.|\.tsbuildinfo$|(^|\/)tsconfig[^/]*\.json$/;

const failures = [];
const summary = [];
const fail = (message) => {
  failures.push(message);
  console.error(`  ✗ ${message}`);
};
const pass = (message) => console.log(`  ✓ ${message}`);
const heading = (title) => console.log(`\n${title}`);
const check = (condition, message) => (condition ? pass(message) : fail(message));

/** Runs a command and resolves with its result; never throws, so a failing step is reported, not fatal. */
function run(command, args, { cwd, env } = {}) {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', (error) => done({ code: 127, output: `${output}${error.message}` }));
    child.on('close', (code) => done({ code: code ?? 1, output }));
  });
}

const indent = (text) => text.replace(/^/gm, '      ');

/** Like `run`, but a non-zero exit is recorded as a failure with the tail of the output. */
async function must(label, command, args, options) {
  const result = await run(command, args, options);
  if (result.code === 0) pass(label);
  else fail(`${label} (exit ${result.code})\n${indent(result.output.trim().split('\n').slice(-25).join('\n'))}`);
  return result;
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const tarList = async (tarball) => (await run('tar', ['-tzf', tarball])).output.split('\n').filter(Boolean).sort();
const tarRead = async (tarball, file) => JSON.parse((await run('tar', ['-xzOf', tarball, file])).output);

/** Every file an `exports` map points at. */
function exportTargets(value, found = new Set()) {
  if (typeof value === 'string') found.add(value);
  else if (value && typeof value === 'object') for (const inner of Object.values(value)) exportTargets(inner, found);
  return found;
}

async function packPackages(workDir) {
  heading('1. Pack the packages');
  const tarballs = {};
  const manifests = {};
  const versions = new Set();
  for (const name of PACKAGES) {
    const dir = join(ROOT, 'packages', name);
    const source = await readJson(join(dir, 'package.json'));
    versions.add(source.version);
    check(source.private !== true, `${source.name}: not private`);
    check(source.license === 'MIT', `${source.name}: MIT license`);

    const packed = await must(`${source.name}: pnpm pack`, 'pnpm', ['pack', '--pack-destination', workDir], {
      cwd: dir,
    });
    const tarball = packed.output
      .split('\n')
      .find((line) => line.trim().endsWith('.tgz'))
      ?.trim();
    if (!tarball || !existsSync(tarball)) {
      fail(`${source.name}: pnpm pack did not report a tarball`);
      continue;
    }
    tarballs[name] = tarball;

    const files = await tarList(tarball);
    const stray = files.filter((file) => !ALLOWED_FILE.test(file) || STRAY_FILE.test(file));
    check(stray.length === 0, `${source.name}: only intended files (${files.length} files)`);
    for (const file of stray) console.error(`      unexpected: ${file}`);
    summary.push({ name: source.name, files: files.length });

    const manifest = await tarRead(tarball, 'package/package.json');
    manifests[name] = manifest;
    check(
      !JSON.stringify(manifest).includes('workspace:'),
      `${source.name}: no workspace: ranges in the packed manifest`,
    );
    check(manifest.private !== true, `${source.name}: packed manifest is not private`);
    check(manifest.publishConfig?.access === 'public', `${source.name}: publishConfig.access is public`);
    check(Boolean(manifest.repository?.url && manifest.engines?.node), `${source.name}: repository and engines set`);
    const missing = [
      ...exportTargets(manifest.exports),
      manifest.main,
      manifest.types,
      ...Object.values(manifest.bin ?? {}),
    ]
      .filter(Boolean)
      .filter((target) => !files.includes(`package/${target.replace(/^\.\//, '')}`));
    check(missing.length === 0, `${source.name}: every export/main/types/bin target is in the tarball`);
    for (const target of missing) console.error(`      missing: ${target}`);
    // The packed manifest must point at the built files, not at the sources of the workspace.
    check(
      !JSON.stringify(manifest.exports).includes('/src/'),
      `${source.name}: the packed exports point at dist, not at src`,
    );
  }
  check(versions.size === 1, `the packages share one version (${[...versions].join(', ')})`);
  const [version] = versions;
  for (const name of PACKAGES.slice(1)) {
    const dependency = manifests[name]?.dependencies?.[`${SCOPE}/extension-sdk`];
    if (dependency !== undefined) check(dependency === version, `${name} depends on extension-sdk ${dependency}`);
  }
  const runtimeDependency = manifests['extension-cli']?.dependencies?.[`${SCOPE}/extension-runtime`];
  check(
    runtimeDependency === version,
    `extension-cli depends on extension-runtime ${runtimeDependency ?? '(nothing)'}`,
  );
  return { tarballs, version };
}

/** pnpm reads overrides and build approvals from pnpm-workspace.yaml, not package.json. */
const pnpmSettings = (tarballs) =>
  `allowBuilds:\n  esbuild: true\n  sharp: true\noverrides:\n${PACKAGES.map((name) => `  '${SCOPE}/${name}': file:${tarballs[name]}`).join('\n')}\n`;

async function installConsumer(dir, tarballs, rootManifest) {
  heading('2. Install the tarballs into an empty project');
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'consumer',
        private: true,
        type: 'module',
        dependencies: Object.fromEntries(PACKAGES.map((name) => [`${SCOPE}/${name}`, `file:${tarballs[name]}`])),
        devDependencies: {
          '@types/node': rootManifest.devDependencies['@types/node'],
          typescript: rootManifest.devDependencies.typescript,
        },
      },
      null,
      2,
    ),
  );
  await writeFile(join(dir, 'pnpm-workspace.yaml'), pnpmSettings(tarballs));
  const install = await must('pnpm install', 'pnpm', ['install', '--prefer-offline'], { cwd: dir });
  if (install.code !== 0) return false;

  const imports = [
    `${SCOPE}/extension-sdk`,
    `${SCOPE}/extension-sdk/manifest`,
    `${SCOPE}/extension-sdk/globals`,
    `${SCOPE}/extension-sdk/repo`,
    `${SCOPE}/extension-runtime`,
    `${SCOPE}/extension-runtime/http-bridge`,
    `${SCOPE}/extension-runtime/repo`,
    `${SCOPE}/extension-runtime/image`,
    `${SCOPE}/extension-templates`,
    `${SCOPE}/extension-cli`,
  ];
  await writeFile(
    join(dir, 'imports.mjs'),
    `for (const id of ${JSON.stringify(imports)}) { await import(id); console.log('imported', id); }\n`,
  );
  const imported = await must('every entry point imports in Node (ESM)', 'node', ['imports.mjs'], { cwd: dir });
  check(
    imported.code !== 0 || imports.every((id) => imported.output.includes(`imported ${id}`)),
    'all entry points reported',
  );

  // Declarations: resolve like a consumer on NodeNext and on Bundler, with the dist `.d.ts` files only. An extension
  // sees the sandbox globals and no Node types (its tsconfig has `types: []`); a tool (the CLI's users, the app) sees
  // Node types and no sandbox globals, which would collide with them.
  await writeFile(
    join(dir, 'extension.ts'),
    `import '${SCOPE}/extension-sdk/globals';
import { SDK_API_VERSION, defineExtension } from '${SCOPE}/extension-sdk';
import { manifestSchema } from '${SCOPE}/extension-sdk/manifest';
import { madara } from '${SCOPE}/extension-templates';

export const extension = defineExtension({ createSource: () => ({ baseUrl: '' }) as never });
export const parse = (value: unknown) => manifestSchema.parse(value);
export const version: number = SDK_API_VERSION;
export const template = madara;
export const fetchGlobal = () => http.get('https://example.com');
`,
  );
  await writeFile(
    join(dir, 'tool.ts'),
    `import { repoIndexSchema } from '${SCOPE}/extension-sdk/repo';
import { ExtensionRuntime } from '${SCOPE}/extension-runtime';
import { parseRepoIndex } from '${SCOPE}/extension-runtime/repo';
import { buildExtension, buildRepo } from '${SCOPE}/extension-cli';

export const index = (bytes: Uint8Array) => repoIndexSchema.parse(parseRepoIndex(bytes));
export const runtime: typeof ExtensionRuntime = ExtensionRuntime;
export const build = (dir: string) => buildExtension(dir, { write: false });
export const repo = buildRepo;
`,
  );
  const tsc = join(dir, 'node_modules/.bin/tsc');
  for (const resolution of ['NodeNext', 'Bundler']) {
    for (const [kind, file, types] of [
      ['extension', 'extension.ts', []],
      ['tool', 'tool.ts', ['node']],
    ]) {
      const config = `tsconfig.${kind}-${resolution}.json`;
      await writeFile(
        join(dir, config),
        JSON.stringify({
          compilerOptions: {
            noEmit: true,
            strict: true,
            // As in the scaffold's tsconfig: third-party declarations (zod's) are not ours to check.
            skipLibCheck: true,
            target: 'ES2022',
            lib: ['ES2023'],
            module: resolution === 'NodeNext' ? 'NodeNext' : 'ESNext',
            moduleResolution: resolution,
            types,
          },
          files: [file],
        }),
      );
      await must(`${kind} declarations type-check (${resolution})`, tsc, ['-p', config], { cwd: dir });
    }
  }
  return true;
}

/** The scaffold needs an icon to go into a repository; then keygen → build → verify with the installed binary. */
async function repositoryRoundTrip(bin, demo) {
  // A PNG signature is all the repository checks look at (the app serves the bytes as they are).
  await writeFile(join(demo, 'icon.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]));
  await must('mr-ext build (with an icon)', bin, ['build'], { cwd: demo });
  await must('mr-ext repo keygen', bin, ['repo', 'keygen', '--out', 'repo-key.pem'], { cwd: demo });
  const generated = await run(bin, ['repo', 'keygen', '--out', 'second-key.pem'], { cwd: demo });
  const publicKey = /Public key: (ed25519:\S+)/.exec(generated.output)?.[1];
  check(publicKey !== undefined, 'mr-ext repo keygen prints the public key');
  await must(
    'mr-ext repo build (with --min-app-version)',
    bin,
    [
      'repo',
      'build',
      '.',
      '-o',
      'repo',
      '--name',
      'Demo repository',
      '--key',
      'second-key.pem',
      '--min-app-version',
      '1.0.0',
    ],
    { cwd: demo },
  );
  for (const file of ['index.json', 'index.json.sig', 'extensions/demo-0.1.0.zip', 'extensions/icons/demo.png']) {
    check(existsSync(join(demo, 'repo', file)), `repo/${file} exists`);
  }
  const index = await readJson(join(demo, 'repo/index.json'));
  check(index.extensions?.[0]?.minAppVersion === '1.0.0', 'the index lists the oldest app version');
  check(Boolean(index.extensions?.[0]?.iconSha256), 'the index lists the hash of the icon');
  const verified = await must(
    'mr-ext repo verify --public-key',
    bin,
    ['repo', 'verify', 'repo', '--public-key', publicKey ?? ''],
    {
      cwd: demo,
    },
  );
  check(verified.code === 0, 'mr-ext repo verify accepts the repository');
  await writeFile(join(demo, 'repo/extensions/icons/demo.png'), 'not the icon');
  const rejected = await run(bin, ['repo', 'verify', 'repo', '--public-key', publicKey ?? ''], { cwd: demo });
  check(rejected.code === 1, 'mr-ext repo verify exits 1 for a tampered icon');
}

async function scaffoldProject(workDir, consumerDir, tarballs, version, rootManifest) {
  heading('3. Scaffold, build and publish an extension from the installed packages');
  const mrExt = join(consumerDir, 'node_modules/.bin/mr-ext');
  const versionOutput = await must('mr-ext --version', mrExt, ['--version'], { cwd: workDir });
  check(versionOutput.output.trim() === version, `mr-ext reports ${version}`);
  await must('mr-ext create demo --name Demo --lang en', mrExt, ['create', 'demo', '--name', 'Demo', '--lang', 'en'], {
    cwd: workDir,
  });
  const demo = join(workDir, 'demo');
  const manifest = await readJson(join(demo, 'package.json')).catch(() => undefined);
  check(
    manifest?.devDependencies?.[`${SCOPE}/extension-sdk`] === `^${version}`,
    `scaffold depends on the SDK ^${version}`,
  );
  check(
    manifest?.devDependencies?.[`${SCOPE}/extension-cli`] === `^${version}`,
    `scaffold depends on the CLI ^${version}`,
  );
  if (!manifest) return;

  // Not on the registry yet: resolve the packages to the tarballs, as the registry would.
  manifest.devDependencies.typescript = rootManifest.devDependencies.typescript;
  manifest.devDependencies['@types/node'] = rootManifest.devDependencies['@types/node'];
  await writeFile(join(demo, 'package.json'), JSON.stringify(manifest, null, 2));
  await writeFile(join(demo, 'pnpm-workspace.yaml'), pnpmSettings(tarballs));
  const install = await must('pnpm install in the scaffold', 'pnpm', ['install', '--prefer-offline'], { cwd: demo });
  if (install.code !== 0) return;

  const bin = join(demo, 'node_modules/.bin/mr-ext');
  await must('mr-ext build', bin, ['build'], { cwd: demo });
  for (const file of ['dist/index.js', 'dist/manifest.json']) check(existsSync(join(demo, file)), `${file} exists`);
  await repositoryRoundTrip(bin, demo);
  await must('tsc --noEmit on the scaffold', join(demo, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.json'], {
    cwd: demo,
  });
}

async function dryRunPublish() {
  heading('4. npm publish --dry-run');
  // pnpm installs Node without npm, so fall back to a pinned npm from the registry (a read, nothing is uploaded).
  const npm = (await run('npm', ['--version'])).code === 0 ? ['npm'] : ['pnpm', 'dlx', 'npm@11'];
  for (const name of PACKAGES) {
    const dir = join(ROOT, 'packages', name);
    const result = await run(npm[0], [...npm.slice(1), 'publish', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: dir,
    });
    // A version that is already on the registry cannot be dry-run again; the tarball was checked in step 1.
    if (/cannot publish over the previously published versions/i.test(result.output)) {
      console.log(`  - ${SCOPE}/${name}: this version is already on npm, dry run skipped (bump the version to run it)`);
      continue;
    }
    let report;
    try {
      const parsed = JSON.parse(result.output.slice(result.output.indexOf('{'), result.output.lastIndexOf('}') + 1));
      // npm 11 keys the report by package name; older versions print it directly.
      report = parsed.files ? parsed : parsed[`${SCOPE}/${name}`];
      if (!report?.files) throw new Error('no file list');
    } catch {
      fail(`${SCOPE}/${name}: npm publish --dry-run printed no report\n${indent(result.output.slice(-1500))}`);
      continue;
    }
    const files = report.files.map((file) => `package/${file.path}`);
    const stray = files.filter((file) => !ALLOWED_FILE.test(file) || STRAY_FILE.test(file));
    check(
      result.code === 0 && stray.length === 0,
      `${SCOPE}/${name}: dry run lists only intended files (${files.length})`,
    );
    for (const file of stray) console.error(`      unexpected: ${file}`);
  }
}

async function main() {
  const rootManifest = await readJson(join(ROOT, 'package.json'));
  const workDir = await mkdtemp(join(tmpdir(), 'mr-verify-'));
  console.log(`Working in ${workDir}`);
  try {
    const { tarballs, version } = await packPackages(workDir);
    if (failures.length === 0) {
      const consumerDir = join(workDir, 'consumer');
      if (await installConsumer(consumerDir, tarballs, rootManifest)) {
        const projectsDir = join(workDir, 'projects');
        await mkdir(projectsDir);
        await scaffoldProject(projectsDir, consumerDir, tarballs, version, rootManifest);
      }
    }
    await dryRunPublish();
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  heading('Summary');
  for (const row of summary) console.log(`  ${row.name}: ${row.files} files in the tarball`);
  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const message of failures) console.error(`  - ${message.split('\n')[0]}`);
    process.exit(1);
  }
  console.log('\nAll package checks passed. Nothing was published.');
}

await main();
