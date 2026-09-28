#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import semver from "semver";
import { buildReleaseNotesResource } from "./release-notes.mjs";

const root = resolve(process.cwd());
const source = resolve(root, process.env.RELEASE_NOTES_SOURCE ?? "docs/releases");
const output = resolve(root, process.env.RELEASE_NOTES_OUTPUT ?? "dist/features/owned-ui/resources/release-notes.json");
const resource = await buildReleaseNotesResource(source);
const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (typeof manifest.version !== "string" || semver.valid(manifest.version) !== manifest.version) {
  throw new Error("package.json does not declare an exact semantic version");
}
if (semver.prerelease(manifest.version) === null
  && !resource.releases.some(release => release.version === manifest.version)) {
  throw new Error(`stable package ${manifest.version} has no matching reviewed release note`);
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(resource, null, 2)}\n`, "utf8");
