const output = process.stdout;
try {
  const { runPiUpgradeConformance } = await import("../../dist/integrations/pi/engine/conformance.js");
  const report = await runPiUpgradeConformance();
  output.write(`${JSON.stringify(report)}\n`);
} catch (error) {
  const message = (error instanceof Error ? error.message : String(error)).replace(/[\r\n\t]+/g, " ").slice(0, 500);
  process.stderr.write(`${JSON.stringify({ schema: "pi-engine-conformance-error-v1", passed: false, message })}\n`);
  process.exitCode = 1;
}
