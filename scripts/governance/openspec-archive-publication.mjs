import { acceptanceUrl, receiptIdentity, receiptIdentityMatches } from "./openspec-acceptance-policy.mjs";
import { createSign, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { archiveReaderFromGet, loadArchiveEvidence } from "./openspec-archive-github.mjs";
import { archiveFailure, assertArchiveDiff, metadataBlock, SHA, CHANGE } from "./openspec-archive-policy.mjs";

const execute = promisify(execFile);
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");

export async function createArchivePublisher({ repository, appId, privateKey, fetchImpl = fetch, deadline = Infinity }) {
  if (!/^\d+$/.test(appId ?? "") || !privateKey) throw archiveFailure("publication-app-setup");
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw archiveFailure("repository-identity");
  const issued = Math.floor(Date.now() / 1000) - 30;
  const message = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: issued, exp: issued + 540, iss: appId })}`;
  let jwt;
  try { jwt = `${message}.${createSign("RSA-SHA256").update(message).sign(privateKey, "base64url")}`; }
  catch { throw archiveFailure("publication-app-key"); }
  async function request(path, method, body, token) {
    const remaining = method === "DELETE" ? 20_000 : deadline - Date.now();
    if (remaining <= 0) throw archiveFailure("archive-deadline");
    let response;
    try {
      response = await fetchImpl(`https://api.github.com${path}`, { method, redirect: "error", signal: AbortSignal.timeout(Math.min(20_000, remaining)),
        headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    } catch { throw archiveFailure("publication-unavailable"); }
    if (!response.ok) throw archiveFailure("publication-request", String(response.status));
    if (response.status === 204) return null;
    return await response.json();
  }
  const app = await request("/app", "GET", undefined, jwt);
  const installation = await request(`/repos/${repository}/installation`, "GET", undefined, jwt);
  if (String(app.id) !== appId || installation.app_id !== app.id || !Number.isSafeInteger(installation.id)
    || !/^[a-z0-9-]+$/.test(app.slug)) throw archiveFailure("publication-app-identity");
  const access = await request(`/app/installations/${installation.id}/access_tokens`, "POST", {
    repositories: [repository.split("/")[1]], permissions: { contents: "write", pull_requests: "write" },
  }, jwt);
  let bot;
  try {
    if (typeof access.token !== "string" || access.permissions?.contents !== "write" || access.permissions?.pull_requests !== "write"
      || Object.keys(access.permissions).some(key => !["contents", "pull_requests", "metadata"].includes(key))) {
      throw archiveFailure("publication-app-permissions");
    }
    bot = await request(`/users/${app.slug}[bot]`, "GET", undefined, access.token);
    if (!Number.isSafeInteger(bot.id) || bot.id < 1 || bot.login !== `${app.slug}[bot]` || bot.type !== "Bot") throw archiveFailure("publication-app-identity");
  } catch (error) {
    if (typeof access.token === "string") {
      try { await request("/installation/token", "DELETE", undefined, access.token); }
      catch { /* Security: expiry remains the final bound when revocation is unavailable. */ }
    }
    throw error;
  }
  const prefix = `/repos/${repository}`;
  return {
    repository, deadline, actor: bot.login, actorEmail: `${bot.id}+${bot.login}@users.noreply.github.com`, token: access.token,
    async mutate(path, method, body) {
      const route = path.slice(prefix.length);
      if (!path.startsWith(`${prefix}/`) || !(
        method === "POST" && (/^\/pulls$/.test(route) || /^\/issues\/\d+\/comments$/.test(route)
          || /^\/git\/(trees|commits)$/.test(route)
          || route === "/git/refs" && /^refs\/heads\/docs\/accept-[a-z0-9-]+-\d+$/.test(body?.ref ?? ""))
        || method === "PATCH" && (/^\/pulls\/\d+$/.test(route) || /^\/issues\/comments\/\d+$/.test(route)))) {
        throw archiveFailure("publication-route");
      }
      return await request(path, method, body, access.token);
    },
    async ready(number, nodeId) {
      if (!Number.isSafeInteger(number) || number < 1 || typeof nodeId !== "string" || !nodeId) throw archiveFailure("acceptance-pr-identity");
      const result = await request("/graphql", "POST", {
        query: "mutation($id: ID!) { markPullRequestReadyForReview(input: {pullRequestId: $id}) { pullRequest { number } } }",
        variables: { id: nodeId },
      }, access.token);
      if (result.errors || result.data?.markPullRequestReadyForReview?.pullRequest?.number !== number) throw archiveFailure("acceptance-ready-failed");
    },
    async close() { await request("/installation/token", "DELETE", undefined, access.token); },
  };
}

export function archiveMarker(evidence, candidate) {
  return {
    version: evidence.acceptance.kind === "pull-request" ? 2 : 1,
    ...(evidence.acceptance.kind === "pull-request" ? { acceptanceReceipt: receiptIdentity(evidence.acceptance) } : {}),
    change: evidence.implementation.change, sourcePr: evidence.pull.number,
    sourceHead: evidence.pull.head.sha, sourceMerge: evidence.pull.merge_commit_sha,
    targetSha: evidence.targetSha, archive: candidate.paths.archive,
    acceptanceId: evidence.acceptance.id, acceptanceDigest: evidence.acceptance.bodyDigest,
    acceptanceAuthor: evidence.acceptance.author, acceptanceCreatedAt: evidence.acceptance.createdAt,
    validationRunId: evidence.validation.runId,
    sourceBodyDigest: createHash("sha256").update(evidence.pull.body).digest("hex"),
    digest: createHash("sha256").update(JSON.stringify(candidate.changes.map(file => [file.filename,
      file.data === null ? null : createHash("sha256").update(file.data).digest("hex")]).sort((a, b) => a[0].localeCompare(b[0])))).digest("hex"),
  };
}

export function readArchiveMarker(body) {
  const marker = metadataBlock(body ?? "", "openspec-archive");
  if (!marker) return null;
  if (![1, 2].includes(marker.version) || !Number.isSafeInteger(marker.sourcePr) || marker.sourcePr < 1
    || !Number.isSafeInteger(marker.acceptanceId) || marker.acceptanceId < 1
    || !Number.isSafeInteger(marker.validationRunId) || marker.validationRunId < 1
    || !/^[a-zA-Z0-9-]{1,39}$/.test(marker.acceptanceAuthor ?? "")
    || !Number.isFinite(Date.parse(marker.acceptanceCreatedAt))
    || !/^[a-f0-9]{64}$/.test(marker.acceptanceDigest ?? "") || !/^[a-f0-9]{64}$/.test(marker.sourceBodyDigest ?? "")
    || !SHA.test(marker.sourceHead ?? "") || !SHA.test(marker.sourceMerge ?? "") || !SHA.test(marker.targetSha ?? "")
    || !/^[a-f0-9]{64}$/.test(marker.digest ?? "") || typeof marker.archive !== "string"
    || typeof marker.change !== "string" || !CHANGE.test(marker.change)
    || !new RegExp(`^openspec/changes/archive/(?:\\d{4}-\\d{2}-\\d{2}-)?${marker.change}/$`).test(marker.archive)
    || marker.generatedHead !== undefined && !SHA.test(marker.generatedHead)) throw archiveFailure("archive-marker");
  if (marker.version === 2) {
    const receipt = marker.acceptanceReceipt;
    if (!receipt || receipt.kind !== "pull-request" || receipt.pr !== marker.acceptanceId
      || receipt.digest !== marker.acceptanceDigest || receipt.author !== marker.acceptanceAuthor
      || receipt.createdAt !== marker.acceptanceCreatedAt || !SHA.test(receipt.head ?? "") || !SHA.test(receipt.merge ?? "")
      || receipt.path !== `openspec/acceptance/${marker.change}/${marker.sourceHead}.json`) throw archiveFailure("archive-marker-receipt");
  } else if (marker.acceptanceReceipt !== undefined) throw archiveFailure("archive-marker-receipt");
  return marker;
}

const markerText = marker => `\`\`\`openspec-archive\n${JSON.stringify(marker, null, 2)}\n\`\`\``;

export function archivePullBody(repository, marker) {
  return `Archives accepted implementation #${marker.sourcePr}. Canonical specs and archive artifacts were verified in isolation.\n\n`
    + `Acceptance: ${acceptanceUrl(repository, marker.sourcePr, { kind: marker.acceptanceReceipt?.kind, id: marker.acceptanceId })}\n`
    + `Source CI: https://github.com/${repository}/actions/runs/${marker.validationRunId}\n\n`
    + `OpenSpec-only candidate; automatic protected integration follows required current-head CI. Native auto-merge remains intentionally unarmed so an advanced target base cannot integrate stale synchronization.\n\n`
    + markerText(marker);
}

export function memoizeArchiveAuthorityGet(get) {
  const requests = new Map();
  return path => {
    if (!requests.has(path)) requests.set(path, Promise.resolve().then(() => get(path)));
    return requests.get(path);
  };
}

export async function archiveAuthorityCurrent(get, repository, pull, marker) {
  const prefix = `/repos/${repository}`;
  const cachedGet = memoizeArchiveAuthorityGet(get);
  const evidencePromise = loadArchiveEvidence(archiveReaderFromGet(repository, cachedGet), marker.sourcePr)
    .catch(() => null);
  const [commit, source, evidence] = await Promise.all([
    cachedGet(`${prefix}/git/commits/${pull.head.sha}`),
    cachedGet(`${prefix}/pulls/${marker.sourcePr}`),
    evidencePromise,
  ]);
  const committed = readArchiveMarker(commit.message);
  const { generatedHead, ...declared } = marker;
  if (generatedHead !== pull.head.sha || JSON.stringify(committed) !== JSON.stringify(declared)
    || commit.parents?.length !== 1 || commit.parents[0]?.sha !== marker.targetSha) return false;
  if (source.merged !== true || source.head?.sha !== marker.sourceHead || source.merge_commit_sha !== marker.sourceMerge
    || createHash("sha256").update(source.body ?? "").digest("hex") !== marker.sourceBodyDigest) return false;
  return evidence?.disposition === "eligible" && evidence.targetSha === marker.targetSha
    && evidence.acceptance.id === marker.acceptanceId && evidence.acceptance.bodyDigest === marker.acceptanceDigest
    && evidence.acceptance.author === marker.acceptanceAuthor && evidence.acceptance.createdAt === marker.acceptanceCreatedAt
    && receiptIdentityMatches(marker.acceptanceReceipt ?? null, evidence.acceptance)
    && evidence.validation.runId === marker.validationRunId;
}

export async function publishArchive({ publisher, reader, evidence, candidate, recoveryCandidate = null, existing = null,
  retryClosed = false, gitImpl = execute, recheckEvidence = loadArchiveEvidence }) {
  assertArchiveDiff(candidate.changes, candidate.paths);
  const marker = archiveMarker(evidence, candidate);
  const prefix = reader.prefix;
  if (!publisher || publisher.repository !== reader.repository || !publisher.actor?.endsWith("[bot]")) throw archiveFailure("publication-app-setup");
  const matchesSource = value => value?.change === marker.change && value.sourcePr === marker.sourcePr
    && value.sourceHead === marker.sourceHead && value.sourceMerge === marker.sourceMerge;
  let expectedHead = "";
  if (existing) {
    const known = readArchiveMarker(existing.body);
    if (!matchesSource(known) || existing.user?.login !== publisher.actor || existing.head?.ref !== candidate.paths.branch
      || existing.head?.repo?.full_name !== reader.repository || existing.base?.ref !== "develop") throw archiveFailure("archive-pr-ownership");
    if (existing.merged_at) return { disposition: "already-archived", archivePr: existing.number };
    if (existing.state === "closed" && !retryClosed) throw archiveFailure("archive-pr-closed");
    if (known.generatedHead !== existing.head.sha || existing.body !== archivePullBody(reader.repository, known)) throw archiveFailure("archive-human-edits");
    const refreshed = await reader.get(`${prefix}/pulls/${existing.number}`);
    if (refreshed.body !== existing.body || refreshed.head?.sha !== existing.head.sha || refreshed.state !== existing.state) throw archiveFailure("archive-human-edits");
    expectedHead = existing.head.sha;
    if (known.digest === marker.digest && known.targetSha === marker.targetSha && existing.state === "open") {
      return { disposition: "pending", archivePr: existing.number };
    }
  }
  let liveRef = null;
  try { liveRef = await reader.get(`${prefix}/git/ref/heads/${candidate.paths.branch}`); }
  catch (error) { if (error.archiveCode !== "github-not-found") throw error; }
  if (liveRef) {
    if (expectedHead && liveRef.object?.sha !== expectedHead) throw archiveFailure("archive-human-edits");
    if (!expectedHead) {
      const commit = await reader.get(`${prefix}/git/commits/${liveRef.object?.sha}`);
      const recovered = readArchiveMarker(commit.message);
      const recovery = recoveryCandidate ?? candidate;
      const recoveryMarker = archiveMarker(evidence, recovery);
      const recoveryBase = recoveryCandidate?.targetSha ?? marker.targetSha;
      if (!matchesSource(recovered) || recovered.digest !== recoveryMarker.digest || recovered.targetSha !== recoveryBase
        || commit.parents?.length !== 1 || commit.parents[0]?.sha !== recoveryBase) throw archiveFailure("archive-branch-ownership");
      const diff = await reader.pages(`/compare/${recoveryBase}...${liveRef.object.sha}`, 1000, "files");
      assertArchiveDiff(diff, recovery.paths);
      // Security: recover only when every published blob matches the regenerated candidate.
      const tree = await reader.get(`${prefix}/git/trees/${liveRef.object.sha}?recursive=1`);
      const diffPaths = new Set(diff.flatMap(file => [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])]));
      if (tree.truncated || diffPaths.size !== recovery.changes.length
        || recovery.changes.some(file => !diffPaths.has(file.filename))) throw archiveFailure("archive-branch-ownership");
      for (const file of recovery.changes) {
        const item = tree.tree.find(item => item.path === file.filename);
        const expected = file.data === null ? null : createHash("sha1").update(`blob ${file.data.length}\0`).update(file.data).digest("hex");
        if ((item?.sha ?? null) !== expected) throw archiveFailure("archive-branch-ownership");
      }
      expectedHead = liveRef.object.sha;
    }
  } else if (existing?.state === "open") throw archiveFailure("archive-branch-missing");
  else expectedHead = "";

  const target = await reader.get(`${prefix}/git/ref/heads/develop`);
  if (target.object?.sha !== evidence.targetSha) throw archiveFailure("target-advanced");
  const current = await reader.get(`${prefix}/pulls/${evidence.pull.number}`);
  if (current.head?.sha !== evidence.pull.head.sha || current.merge_commit_sha !== evidence.pull.merge_commit_sha || current.body !== evidence.pull.body) {
    throw archiveFailure("source-evidence-changed");
  }
  if (evidence.acceptance.kind !== "pull-request") {
    const comment = await reader.get(`${prefix}/issues/comments/${evidence.acceptance.id}`);
    if (comment.updated_at !== evidence.acceptance.createdAt || comment.created_at !== evidence.acceptance.createdAt
      || comment.user?.login !== evidence.acceptance.author
      || createHash("sha256").update(comment.body ?? "").digest("hex") !== evidence.acceptance.bodyDigest) throw archiveFailure("source-evidence-changed");
  }
  // Provenance: PR-backed authority is reloaded, including manual merge evidence, immediately before push below.

  const root = await realpath(await mkdtemp(join(tmpdir(), "archive-publication-")));
  const checkout = join(root, "checkout");
  await mkdir(checkout);
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: join(root, "home"), USERPROFILE: join(root, "home"),
    GIT_CONFIG_GLOBAL: join(root, "empty-config"), GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${publisher.token}`).toString("base64")}`,
    GIT_CONFIG_KEY_1: "core.hooksPath", GIT_CONFIG_VALUE_1: join(root, "empty-hooks") };
  async function git(args) {
    const remaining = (publisher.deadline ?? Infinity) - Date.now();
    if (remaining <= 0) throw archiveFailure("archive-deadline");
    try { return (await gitImpl("git", args, { cwd: checkout, env, timeout: Math.min(60_000, remaining), maxBuffer: 4 * 1024 * 1024 })).stdout.trim(); }
    catch { throw archiveFailure("archive-git", args[0]); }
  }
  let generatedHead;
  try {
    await git(["init", "--quiet"]);
    await git(["remote", "add", "origin", `https://github.com/${reader.repository}.git`]);
    await git(["fetch", "--quiet", "--depth=1", "origin", "develop"]);
    if (await git(["rev-parse", "FETCH_HEAD"]) !== evidence.targetSha) throw archiveFailure("target-advanced");
    await git(["checkout", "--quiet", "--detach", "FETCH_HEAD"]);
    for (const file of candidate.changes) {
      const path = join(checkout, file.filename);
      if (file.data === null) await rm(path);
      else { await mkdir(join(path, ".."), { recursive: true }); await writeFile(path, file.data); }
    }
    await git(["add", "--", "openspec"]);
    await git(["-c", `user.name=${publisher.actor}`, "-c", `user.email=${publisher.actorEmail ?? `${publisher.actor}@users.noreply.github.com`}`,
      "commit", "--quiet", "-m", `docs(openspec): archive ${marker.change}\n\n${markerText(marker)}`]);
    generatedHead = await git(["rev-parse", "HEAD"]);
    const parseTree = text => new Map(text.split("\0").filter(Boolean).map(line => {
      const match = /^\d+ blob ([a-f0-9]{40})\t(.+)$/.exec(line);
      if (!match) throw archiveFailure("archive-published-tree");
      return [match[2], match[1]];
    }));
    const expectedTree = parseTree(await git(["ls-tree", "-r", "-z", evidence.targetSha, "--", "openspec"]));
    for (const file of candidate.changes) {
      if (file.data === null) expectedTree.delete(file.filename);
      else expectedTree.set(file.filename, createHash("sha1").update(`blob ${file.data.length}\0`).update(file.data).digest("hex"));
    }
    const actualTree = parseTree(await git(["ls-tree", "-r", "-z", "HEAD", "--", "openspec"]));
    if (expectedTree.size !== actualTree.size || [...expectedTree].some(([path, sha]) => actualTree.get(path) !== sha)) throw archiveFailure("archive-published-tree");
    const fresh = await recheckEvidence(reader, evidence.pull.number);
    if (fresh?.disposition !== "eligible" || JSON.stringify(archiveMarker(fresh, candidate)) !== JSON.stringify(marker)) throw archiveFailure("source-evidence-changed");
    await git(["push", `--force-with-lease=refs/heads/${candidate.paths.branch}:${expectedHead}`, "origin", `HEAD:refs/heads/${candidate.paths.branch}`]);
  } finally { await rm(root, { recursive: true, force: true }); }
  const body = archivePullBody(reader.repository, { ...marker, generatedHead });
  const pull = existing?.state === "open"
    ? await publisher.mutate(`${prefix}/pulls/${existing.number}`, "PATCH", { body })
    : await publisher.mutate(`${prefix}/pulls`, "POST", { title: `docs(openspec): archive ${marker.change}`, head: candidate.paths.branch, base: "develop", body });
  return { disposition: "pending", archivePr: pull.number, generatedHead };
}
