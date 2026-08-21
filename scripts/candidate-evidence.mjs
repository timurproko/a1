import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { gunzipSync } from "node:zlib";

export async function createCandidateEvidence(input) {
  const tarball = await readFile(input.tarballPath);
  const manifest = readPackedManifest(tarball);
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  const shasum = createHash("sha1").update(tarball).digest("hex");
  const selected = uniqueStrings(input.selected, "selected validation");
  const outcomes = normalizeOutcomes(input.outcomes);
  if (outcomes.some(outcome => outcome.exitCode !== 0)) throw new Error("candidate has failed validation outcomes");
  validateSourceIdentity(input.commit, "commit");
  validateSourceIdentity(input.tree, "tree");
  validateChannelVersion(input.channel, manifest.version);

  const certification = input.certification ?? defaultCertification(input.channel);
  const evidence = {
    schema: "a1-release-certification-v1",
    source: { commit: input.commit, tree: input.tree },
    package: {
      name: manifest.name,
      version: manifest.version,
      bin: manifest.bin,
      tarball: basename(input.tarballPath),
      integrity,
      shasum,
    },
    channel: input.channel,
    validation: {
      selected,
      outcomes,
      gateIds: outcomes.map(outcome => outcome.id),
    },
    runner: normalizeRunner(input.runner),
    certification,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  validateEvidenceShape(evidence);
  return evidence;
}

export async function verifyCandidateEvidence(evidence, options) {
  validateEvidenceShape(evidence);
  const tarball = await readFile(options.tarballPath);
  const manifest = readPackedManifest(tarball);
  const integrity = `sha512-${createHash("sha512").update(tarball).digest("base64")}`;
  const shasum = createHash("sha1").update(tarball).digest("hex");

  assertEqual(evidence.package.tarball, basename(options.tarballPath), "tarball filename");
  assertEqual(evidence.package.integrity, integrity, "tarball integrity");
  assertEqual(evidence.package.shasum, shasum, "tarball shasum");
  assertEqual(evidence.package.name, manifest.name, "packed package name");
  assertEqual(evidence.package.version, manifest.version, "packed package version");
  assertEqual(JSON.stringify(evidence.package.bin), JSON.stringify(manifest.bin), "packed bin map");
  if (options.commit) assertEqual(evidence.source.commit, options.commit, "source commit");
  if (options.tree) assertEqual(evidence.source.tree, options.tree, "source tree");
  if (options.version) assertEqual(evidence.package.version, options.version, "package version");
  if (options.channel) assertEqual(evidence.channel, options.channel, "release channel");
  validateChannelVersion(evidence.channel, evidence.package.version);
  if (evidence.validation.outcomes.some(outcome => outcome.exitCode !== 0)) throw new Error("candidate evidence contains a failed validation outcome");
  if (options.requireStable === true && evidence.certification.stableEligible !== true) throw new Error("candidate is not stable eligible");
  return { packageName: manifest.name, version: manifest.version, integrity, shasum, bin: manifest.bin };
}

export function readPackedManifest(tarball) {
  const entry = readPackedEntries(tarball).find(candidate => candidate.path === "package/package.json");
  if (!entry) throw new Error("candidate tarball does not contain package/package.json");
  const manifest = JSON.parse(entry.content.toString("utf8"));
  if (!manifest?.name || !manifest?.version || !manifest?.bin) throw new Error("packed package manifest is incomplete");
  return manifest;
}

export function readPackedEntries(tarball) {
  let archive;
  try { archive = gunzipSync(tarball); }
  catch { throw new Error("candidate tarball is not valid gzip content"); }
  const entries = [];
  for (let offset = 0; offset + 512 <= archive.length;) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = readTarString(header.subarray(0, 100));
    const prefix = readTarString(header.subarray(345, 500));
    const path = prefix ? `${prefix}/${name}` : name;
    if (!path.startsWith("package/") || path.includes("../") || path.includes("\\")) throw new Error(`candidate tarball has unsafe entry path: ${path}`);
    const sizeSource = readTarString(header.subarray(124, 136)).trim();
    const size = Number.parseInt(sizeSource || "0", 8);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("candidate tarball has an invalid entry size");
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > archive.length) throw new Error("candidate tarball entry is truncated");
    entries.push({ path, content: Buffer.from(archive.subarray(contentStart, contentEnd)), type: String.fromCharCode(header[156] || 48) });
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function validateEvidenceShape(evidence) {
  if (!evidence || evidence.schema !== "a1-release-certification-v1") throw new Error("candidate evidence schema is missing or unsupported");
  validateSourceIdentity(evidence.source?.commit, "commit");
  validateSourceIdentity(evidence.source?.tree, "tree");
  if (!evidence.package?.name || !evidence.package?.version || !evidence.package?.tarball) throw new Error("candidate package evidence is incomplete");
  if (!/^sha512-/.test(evidence.package.integrity ?? "") || !/^[a-f0-9]{40}$/.test(evidence.package.shasum ?? "")) throw new Error("candidate package digests are incomplete");
  if (!Array.isArray(evidence.validation?.selected) || evidence.validation.selected.length === 0) throw new Error("candidate selected validation is incomplete");
  if (!Array.isArray(evidence.validation?.outcomes) || evidence.validation.outcomes.length === 0) throw new Error("candidate gate outcomes are incomplete");
  if (!Array.isArray(evidence.validation?.gateIds) || evidence.validation.gateIds.length !== evidence.validation.outcomes.length) throw new Error("candidate gate ids are incomplete");
  normalizeRunner(evidence.runner);
  if (!evidence.certification?.class || typeof evidence.certification.stableEligible !== "boolean") throw new Error("candidate certification is incomplete");
  if (!Number.isFinite(Date.parse(evidence.createdAt))) throw new Error("candidate creation timestamp is invalid");
}

function normalizeOutcomes(outcomes) {
  if (!Array.isArray(outcomes) || outcomes.length === 0) throw new Error("candidate gate outcomes are required");
  const ids = new Set();
  return outcomes.map(outcome => {
    if (!outcome?.id || !Number.isInteger(outcome.exitCode)) throw new Error("candidate gate outcome is invalid");
    if (ids.has(outcome.id)) throw new Error(`candidate gate outcome is duplicated: ${outcome.id}`);
    ids.add(outcome.id);
    return { id: outcome.id, exitCode: outcome.exitCode, durationMs: Number(outcome.durationMs ?? 0), ...(outcome.skipped ? { skipped: String(outcome.skipped) } : {}) };
  });
}

function normalizeRunner(runner) {
  if (!runner?.workflow || !runner?.runId || !Number.isInteger(Number(runner.attempt)) || !runner?.label) throw new Error("candidate runner identity is incomplete");
  return { workflow: String(runner.workflow), runId: String(runner.runId), attempt: Number(runner.attempt), label: String(runner.label) };
}

function defaultCertification(channel) {
  if (channel === "next") return { class: "uncertified-development-preview", physical: "deferred", crossPlatform: "deferred", stableEligible: false };
  return { class: "stable-candidate", physical: "required", crossPlatform: "required", stableEligible: false };
}

function validateChannelVersion(channel, version) {
  if (channel === "next") {
    if (!/^\d+\.\d+\.\d+-dev\.\d+$/.test(version)) throw new Error("next candidate must use a -dev.N version");
  } else if (channel === "latest") {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("stable candidate must use a final SemVer version");
  } else throw new Error(`unsupported release channel: ${channel}`);
}

function validateSourceIdentity(value, name) {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) throw new Error(`candidate source ${name} is invalid`);
}

function uniqueStrings(values, name) {
  if (!Array.isArray(values) || values.length === 0 || values.some(value => typeof value !== "string" || value.length === 0)) throw new Error(`${name} is required`);
  return [...new Set(values)];
}

function readTarString(buffer) {
  const end = buffer.indexOf(0);
  return buffer.subarray(0, end < 0 ? buffer.length : end).toString("utf8");
}

function assertEqual(actual, expected, name) {
  if (actual !== expected) throw new Error(`${name} differs from candidate evidence`);
}
