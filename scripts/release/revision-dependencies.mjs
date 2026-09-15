import { spawn } from "node:child_process";
import { extname } from "node:path";

const SCRIPT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const DEFAULT_LIMITS = Object.freeze({ files: 20000, bytes: 32 * 1024 * 1024, fileBytes: 1024 * 1024, timeoutMs: 15000 });

/** Read immutable revisions in two bounded Git batches, memoized only within one comparison. */
export function createRevisionDependencyReader(repository, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  for (const [key, maximum] of Object.entries(DEFAULT_LIMITS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > maximum) throw new TypeError("invalid revision dependency limit");
  }
  const revisions = new Map();
  const stats = { gitCommands: 0, revisions: 0, blobs: 0, bytes: 0 };
  return {
    stats,
    read(revision) {
      if (!/^[0-9a-f]{40}$/u.test(revision)) return Promise.reject(new Error("dependency-revision-identity"));
      if (!revisions.has(revision)) {
        if (revisions.size === 2) return Promise.reject(new Error("dependency-revision-limit"));
        revisions.set(revision, readRevision(revision));
      }
      return revisions.get(revision);
    },
  };

  async function readRevision(revision) {
    stats.revisions++;
    stats.gitCommands++;
    const tree = await runGit(repository, ["ls-tree", "-r", "-l", "-z", "--full-tree", revision], undefined, limits);
    const records = tree.toString("utf8").split("\0");
    if (records.at(-1) !== "") throw new Error("dependency-tree-framing");
    records.pop();
    if (records.length > limits.files) throw new Error("dependency-file-limit");
    const files = new Map();
    const wanted = new Map();
    let totalBytes = 0;
    for (const record of records) {
      const match = /^([0-7]{6}) (blob|commit) ([0-9a-f]{40}) +([0-9]+|-)\t([^\0]+)$/u.exec(record);
      if (!match || !isDependencyPath(match[5]) || files.has(match[5])) throw new Error("dependency-tree-record");
      const [, mode, type, oid, sizeText, path] = match;
      const size = sizeText === "-" ? 0 : Number(sizeText);
      const regular = type === "blob" && ["100644", "100755"].includes(mode);
      const needsSource = regular && (SCRIPT_EXTENSIONS.has(extname(path)) || path === "package.json" || path === "config/integration-dependencies.json" || path.endsWith("/package.json") || /^tsconfig[^/]*\.json$/u.test(path));
      files.set(path, { mode, oid, size });
      if (needsSource) {
        if (!Number.isSafeInteger(size) || size > limits.fileBytes) throw new Error("dependency-source-size-limit");
        if (!wanted.has(oid)) {
          totalBytes += size;
          if (totalBytes > limits.bytes) throw new Error("dependency-source-total-limit");
          wanted.set(oid, size);
        }
      }
    }
    const sources = new Map();
    if (wanted.size > 0) {
      stats.gitCommands++;
      const bytes = await runGit(repository, ["cat-file", "--batch"], `${[...wanted.keys()].join("\n")}\n`, limits);
      let offset = 0;
      for (const [oid, size] of wanted) {
        const end = bytes.indexOf(10, offset);
        if (end === -1 || bytes.subarray(offset, end).toString("ascii") !== `${oid} blob ${size}`) throw new Error("dependency-blob-header");
        offset = end + 1;
        if (offset + size >= bytes.length || bytes[offset + size] !== 10) throw new Error("dependency-blob-framing");
        const source = bytes.subarray(offset, offset + size).toString("utf8");
        if (!Buffer.from(source, "utf8").equals(bytes.subarray(offset, offset + size))) throw new Error("dependency-source-encoding");
        sources.set(oid, source);
        stats.blobs++;
        stats.bytes += size;
        offset += size + 1;
      }
      if (offset !== bytes.length) throw new Error("dependency-blob-trailing-data");
    }
    for (const file of files.values()) if (sources.has(file.oid)) file.source = sources.get(file.oid);
    return { revision, files };
  }
}

/** Reject path ambiguity before resolving imports or writing content-free evidence. */
export function isDependencyPath(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 1024
    && !/[\u0000-\u001f\u007f\\:]/u.test(value) && !value.startsWith("/")
    && value.split("/").every(part => part !== "" && part !== "." && part !== "..");
}

/** No filters, hooks, worktree reads, or raw Git stderr enter snapshot evidence. */
function runGit(repository, args, input, limits) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const child = spawn("git", args, { cwd: repository, stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) { child.kill(); rejectPromise(new Error(error)); }
      else resolvePromise(Buffer.concat(chunks));
    };
    const timer = setTimeout(() => finish("dependency-git-timeout"), limits.timeoutMs);
    child.once("error", () => finish("dependency-git-failed"));
    child.stdin.once("error", () => finish("dependency-git-input-failed"));
    child.stdout.on("data", chunk => {
      size += chunk.length;
      // Security: headers have a separate allowance; source bodies were bounded from ls-tree sizes.
      if (size > limits.bytes + 2 * 1024 * 1024) finish("dependency-git-output-limit");
      else chunks.push(chunk);
    });
    child.once("close", code => finish(code === 0 ? null : "dependency-git-failed"));
    child.stdin.end(input);
  });
}
