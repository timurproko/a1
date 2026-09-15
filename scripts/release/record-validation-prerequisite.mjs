import { resolve } from "node:path";
import { recordBuildReceipt, recordPackageReceipt } from "./validation-receipt.mjs";

const kind = process.argv[2];
if (kind === "build") {
  const output = resolve(valueAfter("--output") ?? ".artifacts/validation/receipts/build.json");
  const receipt = await recordBuildReceipt({ output });
  process.stdout.write(`Validation build receipt: ${output} (${receipt.receiptId})\n`);
} else if (kind === "package") {
  const candidate = valueAfter("--candidate");
  if (!candidate) throw new Error("package receipt requires --candidate");
  const output = resolve(valueAfter("--output") ?? `${candidate.replace(/\.tgz$/u, "")}.receipt.json`);
  const receipt = await recordPackageReceipt(candidate, {
    output,
    buildReceipt: valueAfter("--build-receipt"),
    sourceIdentity: valueAfter("--source-identity"),
  });
  process.stdout.write(`Validation package receipt: ${output} (${receipt.receiptId})\n`);
} else throw new Error("usage: record-validation-prerequisite.mjs build|package [options]");

function valueAfter(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}
