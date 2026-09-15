import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir, platform, arch } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recordBuildReceipt, recordPackageReceipt, verifyBuildReceipt, verifyPackageReceipt } from "../../scripts/release/validation-receipt.mjs";

const roots: string[] = [];
const head = "a".repeat(40);
const toolchain = { platform: "fixture", architecture: "x64", node: "v24.0.0", modules: "137", packageManager: "npm@11", typescript: "5.9.2", cargo: "cargo fixture", rustc: "rustc fixture" };
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function put(root: string, path: string, source: string | Buffer) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}
async function buildFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-build-receipt-")); roots.push(root);
  for (const [path, source] of [
    ["package.json", '{"packageManager":"npm@11","devDependencies":{"typescript":"5.9.2"}}'], ["package-lock.json", "lock"],
    ["tsconfig.json", "{}"], ["tsconfig.build.json", "{}"], ["src/index.ts", "export {};"], ["bin/cli.js", "export {};"],
    ["native/process-guardian/Cargo.toml", '[package]\nversion="1.0.0"'], ["native/process-guardian/Cargo.lock", "lock"],
    ["native/process-guardian/src/main.rs", "fn main() {}"], ["scripts/clean.mjs", "export {};"],
    ["scripts/development/build-process-guardian.mjs", "export {};"], ["scripts/release/generate-runtime-payload-inventory.mjs", "export {};"],
    ["dist/index.js", "export {};"],
  ] as const) await put(root, path, source);
  const executable = platform() === "win32" ? "guardian.exe" : "guardian";
  const bytes = Buffer.from("native fixture");
  await put(root, `dist/native/${platform()}-${arch()}/${executable}`, bytes);
  await put(root, `dist/native/${platform()}-${arch()}/manifest.json`, JSON.stringify({
    schema: "a1-process-guardian-artifact-v1", protocolVersion: 1, crateVersion: "1.0.0", platform: platform(), architecture: arch(),
    artifact: { filename: executable, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length },
  }));
  return root;
}

describe("validation prerequisite receipts", () => {
  it("records and re-verifies complete build inputs, toolchain, emitted files, and native bytes", async () => {
    const root = await buildFixture();
    const output = join(root, ".artifacts/build.json");
    const receipt = await recordBuildReceipt({ repository: root, output, head, toolchain });
    expect(receipt).toMatchObject({ schema: "a1-validation-build-receipt-v1", head, toolchain, receiptId: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect((receipt as any).inputs.entries.map((entry: any) => entry.path)).toEqual(expect.arrayContaining(["src/index.ts", "package-lock.json", "native/process-guardian/src/main.rs"]));
    expect((receipt as any).artifacts.entries.map((entry: any) => entry.path)).toEqual(expect.arrayContaining(["dist/index.js", `dist/native/${platform()}-${arch()}/manifest.json`]));
    await expect(verifyBuildReceipt(output, { repository: root, head, toolchain })).resolves.toEqual(receipt);
  });

  it.each([
    ["source", "src/index.ts"], ["lockfile", "package-lock.json"], ["build config", "tsconfig.build.json"], ["emitted file", "dist/index.js"],
  ])("rejects a changed %s", async (_label, path) => {
    const root = await buildFixture();
    const output = join(root, ".artifacts/build.json");
    await recordBuildReceipt({ repository: root, output, head, toolchain });
    await put(root, path, "tampered");
    await expect(verifyBuildReceipt(output, { repository: root, head, toolchain })).rejects.toThrow("do not match");
  });

  it("rejects changed head/toolchain, forged receipt identity, missing artifacts, and native mismatch", async () => {
    const root = await buildFixture();
    const output = join(root, ".artifacts/build.json");
    await recordBuildReceipt({ repository: root, output, head, toolchain });
    await expect(verifyBuildReceipt(output, { repository: root, head: "b".repeat(40), toolchain })).rejects.toThrow("do not match");
    await expect(verifyBuildReceipt(output, { repository: root, head, toolchain: { ...toolchain, node: "v22.0.0" } })).rejects.toThrow("do not match");
    const value = JSON.parse(await readFile(output, "utf8")); value.head = "b".repeat(40); await writeFile(output, JSON.stringify(value));
    await expect(verifyBuildReceipt(output, { repository: root, head, toolchain })).rejects.toThrow("identity is invalid");
    await rm(output); await expect(verifyBuildReceipt(output, { repository: root, head, toolchain })).rejects.toThrow();
    await recordBuildReceipt({ repository: root, output, head, toolchain });
    const executable = platform() === "win32" ? "guardian.exe" : "guardian";
    await put(root, `dist/native/${platform()}-${arch()}/${executable}`, "tampered native");
    await expect(verifyBuildReceipt(output, { repository: root, head, toolchain })).rejects.toThrow("native artifact differs");
  });

  it("records exact candidate bytes, entries, manifest, producer, and optional source identity", async () => {
    const root = await buildFixture();
    const candidate = join(root, "candidate.tgz");
    const bytes = tarball({ name: "@fixture/app", version: "1.2.3", bin: { app: "bin/cli.js" } });
    await writeFile(candidate, bytes);
    const sourceIdentity = join(root, "candidate-identity.json");
    await writeFile(sourceIdentity, JSON.stringify({ schema: "a1-packed-candidate-v1", source: { commit: head, tree: "b".repeat(40) }, package: {
      name: "@fixture/app", version: "1.2.3", integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`, shasum: createHash("sha1").update(bytes).digest("hex"),
    } }));
    const output = join(root, "candidate.receipt.json");
    const producer = { platform: "fixture", architecture: "x64", node: "v24.0.0" };
    const receipt = await recordPackageReceipt(candidate, { repository: root, output, head, producer, sourceIdentity });
    expect(receipt).toMatchObject({ schema: "a1-validation-package-receipt-v1", head, producer, sourceIdentity: { commit: head }, candidate: {
      sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, name: "@fixture/app", version: "1.2.3", bin: { app: "bin/cli.js" }, entries: { files: 1 },
    } });
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer, sourceIdentity })).resolves.toEqual(receipt);
  });

  it("binds a self-authenticating same-head build receipt without re-reading post-pack build outputs", async () => {
    const root = await buildFixture(), build = join(root, ".artifacts/build.json"), candidate = join(root, "candidate.tgz"), output = join(root, "candidate.receipt.json");
    const buildReceipt = await recordBuildReceipt({ repository: root, output: build, head, toolchain });
    await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3", bin: { app: "bin/cli.js" } }));
    const producer = { platform: "fixture", architecture: "x64", node: "v24.0.0" };
    const receipt = await recordPackageReceipt(candidate, { repository: root, output, head, producer, buildReceipt: build });
    expect(receipt.buildReceiptId).toBe(buildReceipt.receiptId);
    await put(root, "dist/index.js", "post-pack workspace change");
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer, buildReceipt: build })).resolves.toEqual(receipt);
    const forged = JSON.parse(await readFile(build, "utf8")); forged.head = "b".repeat(40); await writeFile(build, JSON.stringify(forged));
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer, buildReceipt: build })).rejects.toThrow("identity is invalid");
  });

  it("rejects tampered candidate, changed producer/head/path, forged receipt, and mismatched source authority", async () => {
    const root = await buildFixture();
    const candidate = join(root, "candidate.tgz"), output = join(root, "candidate.receipt.json");
    await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3", bin: { app: "bin/cli.js" } }));
    const producer = { platform: "fixture", architecture: "x64", node: "v24.0.0" };
    await recordPackageReceipt(candidate, { repository: root, output, head, producer });
    await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.4", bin: { app: "bin/cli.js" } }));
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer })).rejects.toThrow("does not match");
    await writeFile(candidate, tarball({ name: "@fixture/app", version: "1.2.3", bin: { app: "bin/cli.js" } }));
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head: "c".repeat(40), producer })).rejects.toThrow("does not match");
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer: { ...producer, node: "v22.0.0" } })).rejects.toThrow("does not match");
    const receipt = JSON.parse(await readFile(output, "utf8")); receipt.candidate.size += 1; await writeFile(output, JSON.stringify(receipt));
    await expect(verifyPackageReceipt(output, candidate, { repository: root, head, producer })).rejects.toThrow("identity is invalid");
  });
});

function tarball(manifest: Record<string, unknown>): Buffer {
  const content = Buffer.from(JSON.stringify(manifest));
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write("00000000000\0", 124, "ascii");
  header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header[156] = "0".charCodeAt(0);
  return gzipSync(Buffer.concat([header, content, Buffer.alloc(Math.ceil(content.length / 512) * 512 - content.length), Buffer.alloc(1024)]));
}
