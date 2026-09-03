import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverReleasePayload } from "../../dist/foundation/release/release.js";
import {
  RUNTIME_PAYLOAD_INVENTORY,
  generateDependencyRuntimePayload,
} from "../../dist/foundation/release/dependency-layer.js";
import { PRODUCT_IDENTITY } from "../../dist/product-identity.js";

const repository = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const payload = await discoverReleasePayload(repository);
const productPaths = payload.paths.filter(path => !path.startsWith("node_modules/"));
const selected = await generateDependencyRuntimePayload(payload.packageRoot, payload.paths, productPaths);
const declaredAssets = selected.paths.filter(path => /\.(?:json|node|wasm|css|html|png|jpg|jpeg|gif|svg)$/.test(path)
  || /(?:^|\/)LICENSE(?:\.|$)/i.test(path));
const output = {
  schema: PRODUCT_IDENTITY.evidence.runtimePayloadSchema,
  entryPoints: ["bin/cli.js", "bin/guardian.js", "bin/supervisor.js", "bin/ui.js", "bin/warmup.js"],
  declaredAssets,
  paths: selected.paths,
  classifications: selected.classifications,
  inventory: selected.inventory,
};
await writeFile(resolve(repository, RUNTIME_PAYLOAD_INVENTORY), `${JSON.stringify(output, null, 2)}\n`, "utf8");
