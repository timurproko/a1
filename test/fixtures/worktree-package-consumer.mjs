import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, realpath, rename, rm, utimes, writeFile } from 'node:fs/promises';
import { join, resolve, toNamespacedPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { captureWorktreeCleanupSnapshot } from '@timurproko/a1/dist/foundation/lifecycle/worktree-cleanup-snapshot.mjs';
import { executeUnclaimedWorktreeCleanup, withUnclaimedWorktree, executeCleanupCommand } from '@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
// Provenance: these imports only exercise the packaged claim producer and compatibility; XR consumes the two modules above.
import { withWorktreeClaimExclusion } from '@timurproko/a1/dist/foundation/lifecycle/worktree-claim-boundary.mjs';
import * as context from '@timurproko/a1/dist/foundation/lifecycle/session-repository-context.js';
import { withSessionClaimSnapshot, withSessionClaimLock } from '@timurproko/a1/dist/foundation/lifecycle/session-claim-lock.js';
import { requestSessionWorktreeCompletion, requestSessionWorktreeLocalRemoval, settleSessionWorktreeCompletion } from '@timurproko/a1/dist/foundation/lifecycle/session-worktree-completion.js';
import { DatabaseSync } from 'node:sqlite';
import { inspectClaimGate, recoverClaimGate, readClaimGate, tryAcquireClaimGate } from '@timurproko/a1/dist/foundation/lifecycle/claim-gate-core.mjs';
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
  const contend = (mode, gate, protectedPath = '', stopPath = '') => {
    const child=spawn(process.execPath,[fileURLToPath(new URL('./database-worker.mjs',import.meta.url)),mode,gate,
      import.meta.resolve('@timurproko/a1/dist/foundation/lifecycle/claim-gate-core.mjs'),protectedPath,stopPath],{cwd:directory,stdio:['ignore','pipe','pipe','ipc']});
    handles.push(child);child.stderr.resume();child.stdout.resume();return child;
  };
  const actor = async () => { const child = start('attach'); await once(child,'message'); return async command => { const reply = once(child,'message'); child.send(command); return (await reply)[0]; }; };
  const leaf = async () => { await wait(data.ready); const value = JSON.parse(await readFile(data.ready,'utf8')); pids.add(value.pid); return value; };
  t.after(async () => {
    await writeFile(data.release,'fixture teardown');
    for (const child of handles) if (child.exitCode === null && child.signalCode === null) { const closed = once(child,'close'); child.kill('SIGKILL'); await closed; }
    for (const pid of pids) await stopped(pid);
    await rm(directory,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  });
  const normalized = process.platform === 'win32' ? resolve(path).toLowerCase() : resolve(path);
  return { ...data, directory, file, git, start, contend, actor, leaf, gate: join(snapshot.commonDir,'worktree-claim-gates',createHash('sha256').update(normalized).digest('hex')+'.gate') };
}
const probe = (name, fn) => test(name,{timeout:60_000},fn);
const gateActive = path => process.platform === 'win32' ? readClaimGate(path) !== null : exists(path);
async function recoverable(path) {
  const until = Date.now()+20_000;
  for (;;) { const value=inspectClaimGate(path); if(value.state==='recoverable') return value; assert(Date.now()<until,JSON.stringify(value)); await delay(50); }
}
probe('packaged lifecycle retirement waits for temporary BEGIN/COMMIT contention while its owner stays alive', async t => {
  if(process.platform!=='win32' || process.arch!=='x64'){t.skip('Windows SQLite authority only');return;}
  const f=await fixture(t), directory=join(f.dataDir,'session-worktree-claims');
  const global=join(directory,'mutation.authority.gate');
  const abort=new AbortController();
  const cases=[
    ['global mutation',global,'hold',run=>withSessionClaimLock(directory,{signal:abort.signal},run)],
    ['global snapshot',global,'read',run=>withSessionClaimSnapshot(directory,{},run)],
    ['target cleanup',f.gate,'hold',run=>withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},run)],
    ['target attachment',f.gate,'read',run=>withWorktreeClaimExclusion(f.snapshot,{dataDir:f.dataDir},run)],
  ];
  for(const [name,gate,mode,run] of cases){
    let blocker, settled=false, entered;const ready=new Promise(resolve=>{entered=resolve;});
    const outcome=run(async()=>{blocker=f.contend(mode,gate);assert.deepEqual((await once(blocker,'message'))[0],{locked:true});entered();})
      .then(()=>{settled=true;return {ok:true};},error=>{settled=true;return {error};});
    await ready;if(name==='global mutation')abort.abort();await delay(50);assert.equal(settled,false,`${name} lost its handle instead of awaiting retirement`);
    const closed=once(blocker,'close');blocker.send('commit');await closed;
    assert.deepEqual(await outcome,{ok:true});assert.equal(readClaimGate(gate),null);
    const successor=tryAcquireClaimGate(gate.slice(0,-5));assert(successor,`${name} stranded live authority`);successor.release();
  }
  await withSessionClaimLock(directory,{},async()=>{});await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>{});
  assert.equal(await exists(f.path),true);assert.equal(await f.git(f.primary,['rev-parse','fix/task']),f.snapshot.head);
});
probe('packaged delegation retains its pending intent through database contention before destructive spawn', async t => {
  if(process.platform!=='win32' || process.arch!=='x64'){t.skip('Windows SQLite authority only');return;}
  const f=await fixture(t), spawned=join(f.directory,'spawned');
  await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>{
    const blocker=f.contend('hold',f.gate);assert.deepEqual((await once(blocker,'message'))[0],{locked:true});
    let settled=false;const issued=executeCleanupCommand(process.execPath,['-e',"require('node:fs').writeFileSync(process.argv[1],'done')",spawned],{cwd:f.primary,protectTarget:true})
      .then(()=>{settled=true;return {ok:true};},error=>{settled=true;return {error};});
    await delay(50);assert.equal(settled,false);assert.equal(await exists(spawned),false);
    assert.equal((await (await import('node:fs/promises')).readdir(f.gate+'.children')).length,1);
    const closed=once(blocker,'close');blocker.send('commit');await closed;assert.deepEqual(await issued,{ok:true});
  });
  assert.equal(await readFile(spawned,'utf8'),'done');assert.equal(readClaimGate(f.gate),null);
});
probe('packaged production acquisition contention never overlaps protected work or strands a live owner', async t => {
  if(process.platform!=='win32' || process.arch!=='x64'){t.skip('Windows SQLite authority only');return;}
  const f=await fixture(t), directory=join(f.dataDir,'session-worktree-claims');
  for(const [name,gate,run] of [
    ['global',join(directory,'mutation.authority.gate'),operation=>withSessionClaimLock(directory,{},operation)],
    ['target',f.gate,operation=>withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},operation)],
  ]){
    const protectedPath=join(f.directory,name+'.protected'),stopPath=join(f.directory,name+'.stop');let contender,stats;
    for(let round=0;round<3;round++)await run(async()=>{
      await writeFile(protectedPath,'protected work');
      if(!contender){contender=f.contend('compete',gate,protectedPath,stopPath);assert.deepEqual((await once(contender,'message'))[0],{ready:true});stats=once(contender,'message');}
      await delay(10);await rm(protectedPath);
    });
    const closed=once(contender,'close');await writeFile(stopPath,'stop');const [result]=await stats;assert(result.attempts>0);assert.equal(result.overlaps,0);assert.equal((await closed)[0],0);
    await run(async()=>{});assert.equal(readClaimGate(gate),null);
  }
});
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
  assert.equal(await gateActive(f.gate),false);
});
probe('packaged withUnclaimedWorktree tracks a participating destructive descendant', async t => {
  const f = await fixture(t); await writeFile(f.release,'continue');
  await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},()=>executeCleanupCommand(process.execPath,[worker,'cleanup',f.file],{cwd:f.primary,protectTarget:true}));
  assert.equal(await exists(f.path),false); assert.equal(await gateActive(f.gate),false);
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
  try { await delay(11_000); assert.equal((await actor('attach')).code,'worktree-claim-busy');
    if(process.platform==='win32'){const inspection=inspectClaimGate(f.gate);assert.equal(inspection.state,'live');assert.throws(()=>recoverClaimGate(inspection));}
  }
  finally { await suspend(holder.pid,false); }
  const finished = once(holder,'message'); await writeFile(f.release,'continue'); assert.equal((await finished)[0].finished,true);
});
for (const descendant of [false,true]) probe(`packaged ${descendant?'cleanup parent':'holder'} death refuses surviving descendants then supports exact-generation recovery`, async t => {
  const f = await fixture(t,{descendant}), actor = await f.actor(), holder = f.start('holder'), child = await f.leaf();
  if (descendant) { const finished = once(holder,'message'); process.kill(child.parent,'SIGKILL'); assert.equal((await finished)[0].code,'worktree-cleanup-child-unverifiable'); }
  else { const closed = once(holder,'close'); holder.kill('SIGKILL'); await closed; }
  if (descendant) { const closed=once(holder,'close'); holder.kill('SIGKILL'); await closed; }
  if (process.platform === 'win32') assert.equal(inspectClaimGate(f.gate).state,'surviving-descendant');
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
  if (process.platform === 'win32') {
    const approval=await recoverable(f.gate); assert.equal(recoverClaimGate(approval).state,'recovered');
    await writeFile(join(f.path,'private.txt'),'retained new work');
    await assert.rejects(withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>assert.fail('stale cleanup ran')),{code:'worktree-cleanup-snapshot-changed'});
    assert.equal((await actor('attach')).attached,true);
    assert.equal(await readFile(join(f.path,'private.txt'),'utf8'),'retained new work');
    assert.equal(await f.git(f.primary,['rev-parse','fix/task']),f.snapshot.head);
    assert.equal(await exists(other),true);
  }
});
probe('packaged global mutation orphan is explicitly recovered without namespace switching or claim loss', async t => {
  const f = await fixture(t), actor = await f.actor(); assert.equal((await actor('attach')).attached,true);
  const claimPath=join(f.dataDir,'session-worktree-claims','worktrees',createHash('sha256').update(`${process.platform==='win32'?f.snapshot.commonDir.toLowerCase():f.snapshot.commonDir}\0${process.platform==='win32'?f.snapshot.gitDir.toLowerCase():f.snapshot.gitDir}`).digest('hex')+'.json');
  const originalClaim=await readFile(claimPath), originalSession=await readFile(f.session.sessionFile);
  const holder = f.start('global'); await wait(f.ready);
  const closed = once(holder,'close'); holder.kill('SIGKILL'); await closed;
  const directory = join(f.dataDir,'session-worktree-claims'), gate = join(directory,'mutation.authority.gate');
  const old = new Date(Date.now()-86400000); await utimes(gate,old,old);
  await assert.rejects(withSessionClaimSnapshot(directory,{lockTimeoutMs:100},async()=>{}),error=>error.code==='worktree-claim-busy' && /inspect\/recover/i.test(error.message));
  await assert.rejects(context.registerSessionRepositoryRuntime(f.session,'restarted',{pid:process.pid,startIdentity:'fixture'},
    {dataDir:f.dataDir,lockTimeoutMs:100,inspectProcess:async pid=>({pid,startIdentity:'fixture'})}),{code:'worktree-claim-busy'});
  assert.equal(await exists(gate),true); assert.equal(await exists(f.path),true);
  await withSessionClaimSnapshot(join(f.directory,'new-isolated-namespace'),{},async()=>{});
  assert.equal(await exists(gate),true,'new namespace is not original mutation-gate recovery');
  if (process.platform === 'win32') {
    const claim=join(directory,'preserved-claim.json'); await writeFile(claim,'retain bytes');
    await recoverable(gate);
    const cli=fileURLToPath(import.meta.resolve('@timurproko/a1/dist/foundation/lifecycle/claim-gate-recovery.mjs')), approvalFile=join(f.directory,'approval.json');
    const inspected=await exec(process.execPath,[cli,'inspect','--scope','global','--data-dir',f.dataDir,'--output',approvalFile]);
    assert.equal(JSON.parse(inspected.stdout).state,'recoverable');
    const recovered=await exec(process.execPath,[cli,'recover','--approval',approvalFile]); assert.equal(JSON.parse(recovered.stdout).state,'recovered');
    let ran=false; await withSessionClaimLock(directory,{},async()=>{ran=true;}); assert(ran);
    await withSessionClaimSnapshot(directory,{},async()=>{});
    assert.equal(await readFile(claim,'utf8'),'retain bytes'); assert.equal(await exists(f.path),true);
    assert.deepEqual(await readFile(claimPath),originalClaim); assert.deepEqual(await readFile(f.session.sessionFile),originalSession);
    assert.equal((await actor('attach')).attached,true);
  }
});
probe('packaged recovery interruption rolls back and concurrent retries cannot clear successor authority', async t => {
  if (process.platform !== 'win32') { t.skip('Windows v2 lifetime evidence only'); return; }
  const f=await fixture(t), holder=f.start('global'); await wait(f.ready);
  const directory=join(f.dataDir,'session-worktree-claims'), gate=join(directory,'mutation.authority.gate');
  const live=inspectClaimGate(gate); assert.equal(live.state,'live'); assert.throws(()=>recoverClaimGate(live));
  const closed=once(holder,'close'); holder.kill('SIGKILL'); await closed;
  const approval=await recoverable(gate);
  await writeFile(f.file,JSON.stringify({...f,approval}));
  const interrupted=f.start('recover'); await once(interrupted,'message');
  const until=Date.now()+10_000; let locked=false;
  while(!locked && Date.now()<until) {
    const db=new DatabaseSync(toNamespacedPath(gate));
    try { db.exec('BEGIN IMMEDIATE; ROLLBACK'); } catch(error) { assert.match(error.message,/locked/); locked=true; } finally { db.close(); }
    if(!locked) await delay(1);
  }
  assert(locked,'production recovery held its serialized transaction');
  await assert.rejects(rename(gate,gate+'.while-locked'),error=>['EPERM','EACCES','EBUSY'].includes(error.code),'Windows sharing forbids replacing a database while recovery holds it');
  const terminated=once(interrupted,'close'); interrupted.kill('SIGKILL'); await terminated;
  assert.equal((await recoverable(gate)).nonce,approval.nonce,'interrupted recovery never commits a partial authority transfer');
  const a=f.start('recover'), b=f.start('recover');
  const result=async child=>{ for(;;) { const [message]=await once(child,'message'); if(!message.starting)return message; } };
  const results=await Promise.all([result(a),result(b)]); assert.equal(results.filter(r=>r.state==='recovered').length,1);
  const successor=tryAcquireClaimGate(gate.slice(0,-5)); assert(successor);
  assert.throws(()=>recoverClaimGate(approval),/generation changed/); assert.equal(readClaimGate(gate).nonce,successor.nonce); successor.release();
  let ran=false; await withSessionClaimLock(directory,{},async()=>{ran=true;}); assert(ran);
});
probe('packaged target recovery serializes with simultaneous attachment and cleanup acquisition', async t => {
  if(process.platform!=='win32'){t.skip('Windows v2 recovery only');return;}
  const f=await fixture(t,{noRemove:true}), actor=await f.actor(),holder=f.start('holder');const child=await f.leaf();
  const ended=once(holder,'close');holder.kill('SIGKILL');await ended;
  await writeFile(f.release,'finish without removal');await wait(f.done);await stopped(child.pid);
  const approval=await recoverable(f.gate);await writeFile(f.file,JSON.stringify({...f,approval}));
  const recovering=f.start('recover');await once(recovering,'message');
  const recovered=once(recovering,'message').then(([result])=>result);
  let protectedRuns=0;
  const cleanup=withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir,lockTimeoutMs:150},async()=>{protectedRuns++;return 'protected';})
    .catch(error=>{assert(['worktree-claim-busy','attached-session'].includes(error.code),String(error));return error.code;});
  const [recovery,attachment,execution]=await Promise.all([recovered,actor('attach'),cleanup]);
  assert.equal(recovery.state,'recovered');assert(attachment.attached || attachment.code==='worktree-claim-busy');
  assert(['protected','worktree-claim-busy','attached-session'].includes(execution));assert.equal(protectedRuns,execution==='protected'?1:0);
  if(!attachment.attached)assert.equal((await actor('attach')).attached,true);
  await assert.rejects(withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>assert.fail('cleanup overlapped a committed editing claim')),{code:'attached-session'});
  assert.equal((await actor('detach')).detached,true);await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>{});
  assert.equal(await exists(f.path),true);assert.equal(await f.git(f.primary,['rev-parse','fix/task']),f.snapshot.head);
});
probe('packaged replacement, malformed, linked and legacy gates never receive stale recovery', async t => {
  if (process.platform !== 'win32') { t.skip('Windows v2 lifetime evidence only'); return; }
  const f=await fixture(t), holder=f.start('global'); await wait(f.ready);
  const gate=join(f.dataDir,'session-worktree-claims','mutation.authority.gate');
  const closed=once(holder,'close');holder.kill('SIGKILL');await closed; const approval=await recoverable(gate);
  const moved=gate+'.original'; await rename(gate,moved);
  const replacement=tryAcquireClaimGate(gate.slice(0,-5)); assert(replacement);
  assert.throws(()=>recoverClaimGate(approval),/replaced/); assert.equal(readClaimGate(gate).nonce,replacement.nonce); replacement.release();
  for(const [name,bytes] of [['legacy',JSON.stringify({nonce:'old',pid:process.pid})],['malformed','not a database']]) {
    const path=join(f.directory,name+'.gate'); await writeFile(path,bytes); const before=await readFile(path);
    assert.equal(inspectClaimGate(path).state,'unverifiable'); assert.deepEqual(await readFile(path),before);
  }
  const linked=join(f.directory,'linked.gate'); await (await import('node:fs/promises')).symlink(gate,linked,'file').catch(async()=>{
    await (await import('node:fs/promises')).link(gate,linked);
  });
  assert.equal(inspectClaimGate(linked).state,'unverifiable'); assert.throws(()=>recoverClaimGate({...approval,path:linked}));
});
probe('packaged observer loss never turns same-boot Job-name absence into recovery permission', async t => {
  if(process.platform!=='win32'){t.skip('Windows v2 witness only');return;}
  const f=await fixture(t),holder=f.start('global');await wait(f.ready);
  const gate=join(f.dataDir,'session-worktree-claims','mutation.authority.gate'), state=readClaimGate(gate);
  const original=inspectClaimGate(gate);
  const observer=state.lifetime.observer;assert(observer>0 && observer!==holder.pid && observer!==process.pid);
  process.kill(observer,'SIGKILL');await stopped(observer);
  const ended=once(holder,'close');holder.kill('SIGKILL');await ended;
  const inspection=inspectClaimGate(gate);assert.equal(inspection.state,'unverifiable');assert.match(inspection.detail,/completion receipt/);
  assert.throws(()=>recoverClaimGate({...original,state:'recoverable',nonce:state.nonce}),/completion receipt/);
  assert.equal(readClaimGate(gate).nonce,state.nonce);
});
probe('packaged delayed old-holder release cannot clear a replaced successor generation', async t => {
  if(process.platform!=='win32'){t.skip('Windows v2 storage only');return;}
  const f=await fixture(t), holder=f.start('global');await wait(f.ready);
  const gate=join(f.dataDir,'session-worktree-claims','mutation.authority.gate'); await rename(gate,gate+'.old-live-fixture');
  const successor=tryAcquireClaimGate(gate.slice(0,-5));assert(successor);
  const exited=once(holder,'close');await writeFile(f.release,'delayed release');const [code]=await exited;assert.notEqual(code,0);
  assert.equal(readClaimGate(gate).nonce,successor.nonce);successor.release();
});
probe('packaged target recovery preserves dirty/private content, claims, refs and unrelated targets', async t => {
  if(process.platform!=='win32'){t.skip('Windows v2 lifetime evidence only');return;}
  const f=await fixture(t,{noRemove:true}), holder=f.start('holder'); const child=await f.leaf();
  const closed=once(holder,'close');holder.kill('SIGKILL');await closed;
  const running=inspectClaimGate(f.gate);assert.equal(running.state,'surviving-descendant'); assert.throws(()=>recoverClaimGate(running));
  await writeFile(join(f.path,'dirty-private.txt'),'do not delete');
  await writeFile(join(f.snapshot.commonDir,'info','exclude'),'.private/\n');
  await mkdir(join(f.path,'.private'));await writeFile(join(f.path,'.private','secret'),'ignored private bytes');
  const journal=join(f.directory,'cleanup-journal.json');await writeFile(journal,'retain journal bytes');
  const other=join(f.directory,'other');await f.git(f.primary,['worktree','add','-b','fix/unrelated',other]);
  await writeFile(f.release,'finish without removal');await wait(f.done);await stopped(child.pid);
  const approval=await recoverable(f.gate);assert.equal(recoverClaimGate(approval).state,'recovered');
  assert.equal(await readFile(join(f.path,'dirty-private.txt'),'utf8'),'do not delete');
  assert.equal(await f.git(f.primary,['rev-parse','fix/task']),f.snapshot.head);assert.equal(await exists(other),true);
  const actor=await f.actor();assert.equal((await actor('attach')).attached,true);assert.equal((await actor('detach')).detached,true);
  await withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>{});
  await writeFile(join(f.path,'README.md'),'changed after recovery');await f.git(f.path,['add','README.md']);await f.git(f.path,['commit','-m','changed head after recovery']);
  await assert.rejects(withUnclaimedWorktree(f.snapshot,{dataDir:f.dataDir},async()=>assert.fail('recovery reapproved HEAD')),{code:'worktree-cleanup-snapshot-changed'});
  assert.equal(await readFile(join(f.path,'.private','secret'),'utf8'),'ignored private bytes');assert.equal(await readFile(journal,'utf8'),'retain journal bytes');
});
probe('packaged global diagnostic metadata is recoverable only when no authority gate exists', async t => {
  const f = await fixture(t), directory = join(f.dataDir,'session-worktree-claims'), barrier = join(directory,'mutation.lock');
  await mkdir(barrier,{recursive:true}); await writeFile(join(barrier,'owner.json'),JSON.stringify({generation:'abandoned-diagnostic'}));
  await withSessionClaimLock(directory,{},async()=>{});
  assert.equal(JSON.parse(await readFile(join(barrier,'recovery.json'),'utf8')).reason,'abandoned-mutation-metadata');
  assert.equal(await exists(join(barrier,'owner.json')),false);
  assert.equal(await gateActive(join(directory,'mutation.authority.gate')),false);
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
