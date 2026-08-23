import identity from "../src/product-identity.json" with { type: "json" };

process.stderr.write(
  `Local npm preview publication is disabled. Use .github/workflows/npm-publish.yml with the exact accepted ${identity.packageName} source commit, version, integrity, and shasum.\n`,
);
process.exitCode = 1;
