import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { captureWorktreeCleanupSnapshot } from '@timurproko/a1/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs';
import { executeUnclaimedWorktreeCleanup, withUnclaimedWorktree, executeCleanupCommand } from '@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
// Provenance: these imports only exercise the packaged claim producer and compatibility; XR consumes the two modules above.
import * as context from '@timurproko/a1/dist/foundation/lifecycle/session-repository-context.js';
import { withSessionClaimSnapshot, withSessionClaimLock } from '@timurproko/a1/dist/foundation/lifecycle/session-claim-lock.js';
import { requestSessionWorktreeCompletion, requestSessionWorktreeLocalRemoval, settleSessionWorktreeCompletion } from '@timurproko/a1/dist/foundation/lifecycle/session-worktree-completion.js';
import { inspectLiveProcess } from '@timurproko/a1/dist/foundation/lifecycle/process-liveness.js';
const exec = promisify(execFile), root = fileURLToPath(new URL('./', import.meta.url));
const worker = fileURLToPath(new URL('./worker.mjs', import.meta.url));
for (const module of ['worktree-cleanup-snapshot', 'worktree-claim-boundary']) assert(import.meta.resolve(`@timurproko/a1/dist/foundation/lifecycle/${module}.mjs`).startsWith(new URL('./node_modules/', import.meta.url).href));
const exists = path => access(path).then(() => true, () => false);
async function wait(path) { const until = Date.now() + 20_000; while (!await exists(path)) { assert(Date.now() < until, 'fixture readiness deadline'); await delay(20); } }
async function stopped(pid) { const until = Date.now() + 20_000; while (await inspectLiveProcess(pid)) { assert(Date.now() < until, 'controlled fixture child did not exit'); await delay(100); } }
async function suspend(pid, value) {
  if (process.platform !== 'win32') return process.kill(pid, value ? 'SIGSTOP' : 'SIGCONT');
  const method = value ? 'NtSuspendProcess' : 'NtResumeProcess';
  await exec('powershell.exe', ['-NoProfile','-NonInteractive','-Command', `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class FixtureSuspend { [DllImport("ntdll.dll")] public static extern int ${method}(IntPtr p); }'; if ([FixtureSuspend]::${method}([System.Diagnostics.Process]::GetProcessById(${pid}).Handle) -ne 0) { exit 1 }`]);
}
async function fixture(t, extra = {}) {
  const directory = await mkdtemp(join(root, 'fixture-')), primary = join(directory, 'primary'), path = join(directory, 'task'), dataDir = join(directory, 'data');
  const git = async (cwd, args) => (await exec('git', ['-c','core.hooksPath=/dev/null','-c','user.name=Fixture','-c','user.email=fixture@example.com','-C',cwd,...args])).stdout.trim();
  await mkdir(primary); await git(primary, ['init','-b','develop']); await writeFile(join(primary,'README.md'), 'approved content\n');
  await git(primary,['add','.']); await git(primary,['commit','-m','fixture']); await git(primary,['worktree','add','-b','fix/task',path]);
  const session = { sessionId: 'packaged-session', sessionFile: join(directory,'session.jsonl') };
  await writeFile(session.sessionFile, JSON.stringify({type:'session',id:session.sessionId,cwd:primary})+'\n');
  const snapshot = await captureWorktreeCleanupSnapshot(path);
  const data = { primary, path, dataDir, session, snapshot, ready: join(directory,'ready'), release: join(directory,'release'), done: join(directory,'done'), ...extra };
  const file = join(directory,'input.json'); await writeFile(file,JSON.stringify(data));
  const handles = [], pids = new Set();
  const start = mode => { const child = spawn(process.execPath,[worker,mode,file],{cwd:directory,stdio:['ignore','pipe','pipe','ipc']}); handles.push(child); child.stderr.resume(); child.stdout.resume(); return child; };
  const actor = async () => { const child = start('attach'); await once(child,'message'); return async command => { const reply = once(child,'message'); child.send(command); return (await reply)[0]; }; };
  const leaf = async () => { await wait(data.ready); const value = JSON.parse(await readFile(data.ready,'utf8')); pids.add(value.pid); return value; };
  t.after(async () => {
    await writeFile(data.release,'fixture teardown');
    for (const child of handles) if (child.exitCode === null && child.signalCode === null) { const closed = once(child,'close'); child.kill('SIGKILL'); await closed; }
    for (const pid of pids) await stopped(pid);
    await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  });
  const normalized = process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
  return { ...data, directory, file, git, start, actor, leaf, gate: join(snapshot.commonDir,'worktree-claim-gates',createHash('sha256').update(normalized).digest('hex')+'.gate') };
}
const probe = (name, fn) => test(name,{timeout:60_000},fn);
probe('packaged attach/detach/resume retains owned dirty work and blocks cleanup of a live claim', async t => {
  const f = await fixture(t), actor = await f.actor();
  assert.equal((await actor('attach')).attached,true); await writeFile(join(f.path,'dirty.txt'),'owned work');
  assert.equal((await actor('attach')).attached,true);
  await assert.rejects(withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>{}),{code:'attached-session'});
  assert.equal((await actor('detach')).detached,true); assert.equal((await actor('attach')).attached,true);
  assert.equal(await readFile(join(f.path,'dirty.txt'),'utf8'),'owned work');
});
probe('packaged executeUnclaimedWorktreeCleanup removes exactly the approved checkout without runtime initialization', async t => {
  const f = await fixture(t); await writeFile(f.release,'continue');
  await executeUnclaimedWorktreeCleanup(f.snapshot,process.execPath,[worker,'cleanup',f.file],{dataDir:f.dataDir,cwd:f.primary});
  assert.equal(await exists(f.path),false); assert.equal(await exists(f.dataDir),false);
  assert.equal(await f.git(f.primary,['rev-parse','fix/task']),f.snapshot.head);
  assert.equal(await exists(f.gate),false);
});
probe('packaged withUnclaimedWorktree tracks a participating destructive descendant', async t => {
  const f = await fixture(t); await writeFile(f.release,'continue');
  await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},()=>executeCleanupCommand(process.execPath,[worker,'cleanup',f.file],{cwd:f.primary,protectTarget:true}));
  assert.equal(await exists(f.path),false); assert.equal(await exists(f.gate),false);
});
probe('packaged exclusion refuses a competing attachment while cleanup is active', async t => {
  const f = await fixture(t), actor = await f.actor(), holder = f.start('holder'); await f.leaf();
  assert.deepEqual((await actor('attach')).code,'worktree-claim-busy'); assert.equal(await exists(f.path),true);
  const finished = once(holder,'message'); await writeFile(f.release,'continue'); assert.equal((await finished)[0].finished,true);
  assert.equal(await exists(f.path),false);
});
for (const mutation of ['head','recreated','rebound']) probe(`packaged descendants retain ${mutation} replacements instead of recapturing approval`, async t => {
  const f = await fixture(t,{rebind:mutation==='rebound'}), holder = f.start('holder'); await f.leaf();
  if (mutation === 'recreated') { await f.git(f.primary,['worktree','remove',f.path]); await f.git(f.primary,['worktree','add',f.path,'fix/task']); }
  else { await writeFile(join(f.path,'README.md'),'new work\n'); await f.git(f.path,['add','.']); await f.git(f.path,['commit','-m','new work']); }
  const before = await readFile(join(f.path,'README.md')), finished = once(holder,'message'); await writeFile(f.release,'continue');
  const result = (await finished)[0]; assert.equal(result.finished,false);
  assert.match(result.detail,new RegExp(mutation==='rebound'?'worktree-cleanup-reservation':'worktree-cleanup-snapshot-changed'));
  assert.deepEqual(await readFile(join(f.path,'README.md')),before); assert.equal(await exists(f.done),false);
});
probe('packaged suspended holder keeps exclusion beyond the former lease', async t => {
  const f = await fixture(t), actor = await f.actor(), holder = f.start('holder'); await f.leaf();
  await suspend(holder.pid,true);
  try { await delay(11_000); assert.equal((await actor('attach')).code,'worktree-claim-busy'); }
  finally { await suspend(holder.pid,false); }
  const finished = once(holder,'message'); await writeFile(f.release,'continue'); assert.equal((await finished)[0].finished,true);
});
for (const descendant of [false,true]) probe(`packaged ${descendant?'cleanup parent':'holder'} death leaves original target gate blocked even after its surviving descendant exits`, async t => {
  const f = await fixture(t,{descendant}), actor = await f.actor(), holder = f.start('holder'), child = await f.leaf();
  if (descendant) { const finished = once(holder,'message'); process.kill(child.parent,'SIGKILL'); assert.equal((await finished)[0].code,'worktree-cleanup-child-unverifiable'); }
  else { const closed = once(holder,'close'); holder.kill('SIGKILL'); await closed; }
  assert.equal((await actor('attach')).code,'worktree-claim-busy'); assert.equal(await exists(f.path),true);
  await writeFile(f.release,'continue'); await wait(f.done); await stopped(child.pid);
  assert.equal(await exists(f.gate),true);
  await f.git(f.primary,['worktree','add','-b','fix/recreated',f.path]);
  const old = new Date(Date.now()-86400000); await utimes(f.gate,old,old);
  assert.equal((await actor('attach')).code,'worktree-claim-busy','neither age nor parent/descendant death reclaims original authority');
  const other = join(f.directory,'other'); await f.git(f.primary,['worktree','add','-b','fix/other',other]);
  const otherSnapshot = await captureWorktreeCleanupSnapshot(other);
  await withUnclaimedWorktree(otherSnapshot,{dataDir:f.dataDir},async()=>{});
  assert.equal(await exists(f.gate),true,'a different target succeeding is not original-gate recovery');
});
probe('packaged global mutation orphan blocks snapshots/mutations across targets; restart and age are not recovery', async t => {
  const f = await fixture(t), holder = f.start('global'); await wait(f.ready);
  const closed = once(holder,'close'); holder.kill('SIGKILL'); await closed;
  const directory = join(f.dataDir,'session-worktree-claims'), gate = join(directory,'mutation.authority.gate');
  const old = new Date(Date.now()-86400000); await utimes(gate,old,old);
  await assert.rejects(withSessionClaimSnapshot(directory,{lockTimeoutMs:100},async()=>{}),error=>error.code==='worktree-claim-busy' && /no.*supported in-place crash recovery/i.test(error.message));
  await assert.rejects(context.registerSessionRepositoryRuntime(f.session,'restarted',{pid:process.pid,startIdentity:'fixture'},
    {dataDir:f.dataDir,lockTimeoutMs:100,inspectProcess:async pid=>({pid,startIdentity:'fixture'})}),{code:'worktree-claim-busy'});
  assert.equal(await exists(gate),true); assert.equal(await exists(f.path),true);
  await withSessionClaimSnapshot(join(f.directory,'new-isolated-namespace'),{},async()=>{});
  assert.equal(await exists(gate),true,'new namespace is not original mutation-gate recovery');
});
probe('packaged global diagnostic metadata is recoverable only when no authority gate exists', async t => {
  const f = await fixture(t), directory = join(f.dataDir,'session-worktree-claims'), barrier = join(directory,'mutation.lock');
  await mkdir(barrier,{recursive:true}); await writeFile(join(barrier,'owner.json'),JSON.stringify({generation:'abandoned-diagnostic'}));
  await withSessionClaimLock(directory,{},async()=>{});
  assert.equal(JSON.parse(await readFile(join(barrier,'recovery.json'),'utf8')).reason,'abandoned-mutation-metadata');
  assert.equal(await exists(join(barrier,'owner.json')),false);
  assert.equal(await exists(join(directory,'mutation.authority.gate')),false);
});
probe('quiescent legacy-barrier backup preserves bytes and permits the upgraded global writer, unlike a modern orphan', async t => {
  const f = await fixture(t), legacy = f.start('legacy'); await wait(f.ready);
  const options = {dataDir:f.dataDir,lockTimeoutMs:100,inspectProcess:async pid=>({pid,startIdentity:'fixture'})};
  const register = () => context.registerSessionRepositoryRuntime(f.session,'upgraded',{pid:process.pid,startIdentity:'fixture'},options);
  await assert.rejects(register,{code:'worktree-legacy-recovery-required'});
  const closed = once(legacy,'close'); legacy.kill('SIGKILL'); await closed;
  // Security: only this controlled legacy fixture writer existed; its entrypoint never spawns descendants.
  const barrier = join(f.dataDir,'session-worktree-claims','mutation.lock'), backup = `${barrier}.legacy.backup`;
  const before = await readFile(barrier); await rename(barrier,backup);
  await register(); assert.deepEqual(await readFile(backup),before);
  assert.equal(await exists(f.path),true);
});
probe('packaged legacy declarations and v1 pending requests retain files without sweep fallback', async t => {
  const f = await fixture(t), options = {dataDir:f.dataDir,runtimeId:'compatibility',inspectProcess:async pid=>({pid,startIdentity:'fixture'})};
  await context.registerSessionRepositoryRuntime(f.session,options.runtimeId,{pid:process.pid,startIdentity:'fixture'},options);
  await context.setSessionRepositoryContext(f.session,f.path,options);
  await mkdir(join(f.primary,'.a1'));
  await writeFile(join(f.primary,'.a1','worktree.json'),JSON.stringify({cleanup:['node','untrusted','{worktree}'],localRemoval:{preflight:['node','untrusted','{worktree}'],execute:['node','untrusted','{worktree}']}}));
  for (const request of [()=>requestSessionWorktreeCompletion(f.session,{},options),()=>requestSessionWorktreeLocalRemoval(f.session,options)]) {
    await assert.rejects(request,/no compatible exact preflight\/cleanup adapter/);
    assert.equal((await context.readActiveSessionRepositoryContext(f.session,options)).cwd.replaceAll('\\','/'),f.path.replaceAll('\\','/'));
  }
  const path = context.sessionWorktreeCompletionPath(f.session,options);
  for (const kind of ['complete','remove-local']) {
    const preflight = operation => ['node','-e',`console.log(JSON.stringify({operation:'${operation}',preflight:true,results:[{path:process.argv[1],disposition:'eligible'}]}))`,'{worktree}'];
    const execute = ['node','-e',"throw new Error('must not execute')",'{worktree}','{snapshot}'];
    await writeFile(join(f.primary,'.a1','worktree.json'),JSON.stringify({cleanupPreflight:preflight('preservation-preflight'),cleanup:execute,localRemoval:{preflight:preflight('remove-local'),execute}}));
    await context.setSessionRepositoryContext(f.session,f.path,options);
    if (kind === 'complete') await requestSessionWorktreeCompletion(f.session,{},options);
    else await requestSessionWorktreeLocalRemoval(f.session,options);
    const pending = JSON.parse(await readFile(path,'utf8')); pending.schema = 'a1-session-worktree-completion-v1';
    await writeFile(path,JSON.stringify(pending));
    let calls = 0;
    const result = await settleSessionWorktreeCompletion(f.session,{...options,run:async()=>{calls++; return 'must not execute';}});
    assert.equal(result.kind,'cleanup-unavailable'); assert.match(result.detail,/historical/); assert.equal(calls,0);
    assert.equal(await exists(f.path),true); assert.equal(await context.readActiveSessionRepositoryContext(f.session,options),null);
  }
});
