#!/usr/bin/env node
import assert from 'node:assert/strict';
import crossSpawn from 'cross-spawn';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { walkTarEntries } from '../release/packed-tar.mjs';
import { verifyBuildReceipt } from '../release/validation-receipt.mjs';

// Provenance: diagnostic-only fresh candidate build, local tarball/extraction, no npm install/publish or live runtime.
const root = fileURLToPath(new URL('../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:GIT_|NODE_OPTIONS$|NODE_PATH$|A1_|PI_|GH_|GITHUB_)/u.test(key)));
Object.assign(environment, { npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false' });
const run = (command, args, cwd = root, timeout = 300_000) => {
  const result = crossSpawn.sync(command, args, { cwd, env: environment, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw Object.assign(new Error(`candidate diagnostic failed: ${command} ${args.join(' ')}`), { output: `${result.stdout ?? ''}\n${result.stderr ?? ''}`, cause: result.error });
  return result.stdout;
};
const manifest = JSON.parse(await readFile(join(root,'package.json'),'utf8'));
assert(/^npm@\d+\.\d+\.\d+$/u.test(manifest.packageManager),'unknown package manager pin');
const installedNpm = run('npm',['--version']).trim();
const installedPacking = process.argv.includes('--regression-installed-npm');
const receiptIndex = process.argv.indexOf('--verified-build-receipt');
const buildReceipt = receiptIndex < 0 ? null : process.argv[receiptIndex+1];
if (receiptIndex >= 0) assert(installedPacking && buildReceipt && !buildReceipt.startsWith('--'),'verified build reuse is explicit and regression-only');
if (installedPacking) assert(/^11\.\d+\.\d+$/u.test(installedNpm),'regression packing requires installed npm 11; npm 10 does not reliably honor --ignore-scripts');
const packing = args => installedPacking || installedNpm === manifest.packageManager.slice(4) ? run('npm',args)
  : run('npm',['exec','--offline',`--package=${manifest.packageManager}`,'--','npm',...args]);
const sourceSha = run('git', ['rev-parse','HEAD']).trim();
const dirty = run('git', ['status','--porcelain','--untracked-files=normal']).trim();
const allowDirty = process.argv.includes('--allow-dirty');
const inputPaths = ['src','bin','docs','scripts','config','package.json','package-lock.json'];
const ignored = run('git',['ls-files','--others','--ignored','--exclude-standard','-z','--',...inputPaths]).split('\0').filter(Boolean)
  .filter(path=>path !== 'src/integrations/pi/engine/pi-settings-metadata.json');
assert.equal(ignored.length,0,'unowned ignored build/package inputs exist; retain them and inspect locally rather than packing');
const payloadFiles = new Set(run('git',['ls-files','-z','--','bin','docs','README.md','LICENSE','package.json']).split('\0').filter(Boolean));
if (dirty && !allowDirty) throw new Error('candidate source must be clean; --allow-dirty is development-only and cannot establish exact-head evidence');
const parent = join(root,'.artifacts','agent'); await mkdir(parent,{recursive:true});
const output = await mkdtemp(join(parent,'worktree-package-'));
console.log(`Candidate diagnostic: ${relative(root,output).replaceAll('\\','/')}`);
const report = { schema:'worktree-candidate-diagnostic-v1', sourceSha, sourceTree:run('git',['rev-parse','HEAD^{tree}']).trim(), sourceClean:!dirty,
  dirtyDiffSha256:dirty ? hash(run('git',['diff','HEAD','--binary'])) : null,
  environment:{platform:process.platform,architecture:process.arch,node:process.version,npm:packing(['--version']).trim(),git:run('git',['--version']).trim()},
  authority:'offline-candidate-only', packingPolicy:installedPacking ? 'regression-installed-npm11' : 'pinned-npm', liveInstallation:false, releaseCertification:false,
  commands:['npm run build:core','npm pack --ignore-scripts --json --pack-destination <isolated-output>',
    'node --test --test-concurrency=1 <isolated-consumer>/consumer.mjs','node node_modules/typescript/lib/tsc.js --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2024 --types node --typeRoots <repository>/node_modules/@types <isolated-consumer>/usage.mts'] };
try {
  if (buildReceipt) {
    const receipt = await verifyBuildReceipt(resolve(buildReceipt),{repository:root});
    report.build = {mode:'verified-existing-build',receiptId:receipt.receiptId};
    report.commands[0] = 'verifyBuildReceipt(<explicit-receipt>, {repository})';
    await writeFile(join(output,'build.log'),JSON.stringify(report.build)+'\n');
  } else {
    await writeFile(join(output,'build.log'),run('npm',['run','build:core']));
    report.build = {mode:'fresh-build'};
  }
  const metadata = JSON.parse(packing(['pack','--ignore-scripts','--json','--pack-destination',output]))[0];
  assert.equal(metadata.name,manifest.name); assert.equal(metadata.version,manifest.version);
  assert(/^[A-Za-z0-9._-]+\.tgz$/u.test(metadata.filename),'unsafe candidate filename');
  const tarball = await readFile(join(output,metadata.filename));
  report.package = {name:metadata.name,version:metadata.version,filename:metadata.filename,size:tarball.length,sha256:hash(tarball),integrity:`sha512-${createHash('sha512').update(tarball).digest('base64')}`};
  const consumer = join(output,'consumer'), packageRoot = join(consumer,'node_modules',...metadata.name.split('/'));
  await mkdir(packageRoot,{recursive:true});
  for (const entry of walkTarEntries(gunzipSync(tarball))) {
    assert([0,48].includes(entry.type),'only regular candidate files are admitted');
    const name = entry.path.slice('package/'.length);
    if (!name.startsWith('dist/')) assert(payloadFiles.has(name),'candidate contains an untracked package payload');
    const target = resolve(packageRoot,name);
    assert(relative(packageRoot,target) && !relative(packageRoot,target).startsWith('..'),'candidate entry escaped extraction');
    await mkdir(dirname(target),{recursive:true}); await writeFile(target,entry.content,{flag:'wx'});
  }
  report.declarations = {};
  for (const name of ['claim-gate-core','worktree-cleanup-snapshot','worktree-claim-boundary']) {
    const bytes = await readFile(join(packageRoot,`dist/foundation/lifecycle/${name}.d.mts`));
    assert(bytes.equals(await readFile(join(root,`src/foundation/lifecycle/${name}.d.mts`))),'shipped public declarations drifted');
    report.declarations[name] = hash(bytes);
  }
  const witness = await readFile(join(packageRoot,'dist/foundation/lifecycle/claim-gate-witness.ps1'));
  assert(witness.equals(await readFile(join(root,'src/foundation/lifecycle/claim-gate-witness.ps1'))),'shipped Windows lifetime observer drifted');
  report.witnessSha256 = hash(witness);
  await copyFile(join(root,'test/fixtures/worktree-package-consumer.mjs'),join(consumer,'consumer.mjs'));
  await copyFile(join(root,'test/fixtures/worktree-package-worker.mjs'),join(consumer,'worker.mjs'));
  await copyFile(join(root,'test/fixtures/claim-gate-contention-worker.mjs'),join(consumer,'database-worker.mjs'));
  await writeFile(join(consumer,'usage.mts'),`import { captureWorktreeCleanupSnapshot, type WorktreeCleanupSnapshot } from '${manifest.name}/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs';
import { executeUnclaimedWorktreeCleanup, withUnclaimedWorktree, executeCleanupCommand, type CleanupExecutionOptions } from '${manifest.name}/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
const approved: WorktreeCleanupSnapshot = await captureWorktreeCleanupSnapshot('typecheck-only');
const version: 1 = approved.version;
const options: CleanupExecutionOptions = { dataDir:'same-namespace-as-attachment' };
const one: Promise<string> = executeUnclaimedWorktreeCleanup(approved,'node',['participating-controller.mjs'],options);
const two: Promise<string> = withUnclaimedWorktree(approved,options,()=>executeCleanupCommand('git',[],{...options,protectTarget:true}));
void version; void one; void two;
`);
  await writeFile(join(output,'types.log'),run(process.execPath,[join(root,'node_modules/typescript/lib/tsc.js'),'--noEmit','--strict','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2024','--types','node','--typeRoots',join(root,'node_modules/@types'),join(consumer,'usage.mts')],consumer,30_000));
  const log = run(process.execPath,['--test','--test-concurrency=1',join(consumer,'consumer.mjs')],consumer,600_000);
  await writeFile(join(output,'consumer.log'),log);
  assert(/(?:# fail 0|ℹ fail 0)/u.test(log),'consumer did not report zero failures');
  if (buildReceipt) await verifyBuildReceipt(resolve(buildReceipt),{repository:root});
  report.consumerPassed = true;
  report.consumerLogSha256 = hash(log);
  // Provenance: metadata-only changes by trusted finalization still require a separately named package/head.
  assert.equal(run('git',['rev-parse','HEAD']).trim(),sourceSha,'source head changed during package verification');
  assert.equal(run('git',['status','--porcelain','--untracked-files=normal']).trim(),dirty,'source contents changed during package verification');
} catch (error) {
  report.consumerPassed = false;
  await writeFile(join(output,'failure.log'),error.output ?? String(error.stack ?? error));
  throw error;
} finally {
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({report:relative(root,join(output,'report.json')).replaceAll('\\','/'),sourceSha,sourceClean:report.sourceClean,package:report.package,packingPolicy:report.packingPolicy,consumerPassed:report.consumerPassed}));
}
