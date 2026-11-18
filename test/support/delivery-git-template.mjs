import { after } from 'node:test';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile), seeds = new Map(), roots = [];
after(async () => { for (const root of roots) await rm(root,{recursive:true,force:true,maxRetries:5}); });

/** Cache only synthetic immutable base objects; every case gets its own real Git/admin/ref/config namespace. */
export async function cloneFixtureRepository(primary, files) {
  const entries = files instanceof Map ? [...files] : Object.entries(files);
  const key = createHash('sha256').update(JSON.stringify(entries.sort())).digest('hex');
  if (!seeds.has(key)) seeds.set(key, createSeed(entries));
  const seed = await seeds.get(key);
  // Performance: repeated init/add/commit processes measure Windows process startup, not another preservation case.
  await execute('git',['-c','core.hooksPath=/dev/null','clone','--shared','--origin','fixture-seed','--config','core.autocrlf=false',seed,primary]);
}
async function createSeed(entries) {
  const root = await mkdtemp(join(tmpdir(),'delivery-synthetic-seed-')); roots.push(root);
  const primary = join(root,'seed');
  const git = args => execute('git',['-c','core.hooksPath=/dev/null','-c','core.autocrlf=false','-c','user.name=Fixture','-c','user.email=fixture@example.com','-C',primary,...args]);
  await execute('git',['init','-b','develop',primary]);
  for (const [name, bytes] of entries) { const path = join(primary,name); await mkdir(dirname(path),{recursive:true}); await writeFile(path,bytes); }
  await git(['add','.']); await git(['commit','-m','synthetic fixture base']);
  return primary;
}
