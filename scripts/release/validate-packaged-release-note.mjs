#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import semver from "semver";
import {
  MAX_RELEASE_NOTES_RESOURCE_BYTES,
  parseReleaseNote,
  releaseNotePath,
  validateReleaseNotesResource,
} from "./release-notes.mjs";

const root = resolve(process.cwd());
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (typeof manifest.version !== "string" || semver.valid(manifest.version) !== manifest.version) {
  throw new Error("package.json does not declare an exact semantic version");
}
const resourceBytes = await readFile(resolve(root, "dist/features/owned-ui/resources/release-notes.json"));
if (resourceBytes.length > MAX_RELEASE_NOTES_RESOURCE_BYTES) throw new Error("packaged A1 release notes resource is too large");
const resource = validateReleaseNotesResource(JSON.parse(resourceBytes.toString("utf8")));
if (semver.prerelease(manifest.version) === null) {
  const packaged = resource.releases.find(release => release.version === manifest.version);
  if (!packaged) throw new Error(`stable package ${manifest.version} does not contain its reviewed release note`);
  const source = parseReleaseNote(await readFile(resolve(root, releaseNotePath(manifest.version)), "utf8"), manifest.version);
  if (packaged.markdown !== source.markdown) {
    throw new Error(`stable package ${manifest.version} release note differs from its exact approved source`);
  }
}
