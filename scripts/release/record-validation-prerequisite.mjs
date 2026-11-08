import { resolve } from "node:path";
import { recordBuildReceipt, recordPackageReceipt } from "./validation-receipt.mjs";
import { optionValue } from "../cli-options.mjs";

const kind = process.argv[2];
if (kind === "build") {
  const output = resolve(optionValue("--output") ?? ".artifacts/validation/receipts/build.json");
  const receipt = await recordBuildReceipt({ output });
  process.stdout.write(`Validation build receipt: ${output} (${receipt.receiptId})\n`);
} else if (kind === "package") {
  const candidate = optionValue("--candidate");
  if (!candidate) throw new Error("package receipt requires --candidate");
  const output = resolve(optionValue("--output") ?? `${candidate.replace(/\.tgz$/u, "")}.receipt.json`);
  const receipt = await recordPackageReceipt(candidate, {
    output,
    buildReceipt: optionValue("--build-receipt"),
    sourceIdentity: optionValue("--source-identity"),
  });
  process.stdout.write(`Validation package receipt: ${output} (${receipt.receiptId})\n`);
} else throw new Error("usage: record-validation-prerequisite.mjs build|package [options]");

