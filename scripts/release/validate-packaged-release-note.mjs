#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import semver from "semver";
import { validateReleaseNotesResource } from "./release-notes.mjs";

const root = resolve(process.cwd());
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (typeof manifest.version !== "string" || semver.valid(manifest.version) !== manifest.version) {
  throw new Error("package.json does not declare an exact semantic version");
}
const resource = validateReleaseNotesResource(JSON.parse(await readFile(
  resolve(root, "dist/features/owned-ui/resources/release-notes.json"),
  "utf8",
)));
if (semver.prerelease(manifest.version) === null
  && !resource.releases.some(release => release.version === manifest.version)) {
  throw new Error(`stable package ${manifest.version} does not contain its reviewed release note`);
}
