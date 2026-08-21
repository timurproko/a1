const impact = process.env.IMPACT_JOB_RESULT;
const validation = process.env.VALIDATION_JOB_RESULT;
const selectedSource = process.env.SELECTED_VALIDATION_JSON;
const failures = [];

if (impact !== "success") failures.push(`impact job result is ${impact ?? "missing"}`);
if (validation !== "success") failures.push(`validation job result is ${validation ?? "missing"}`);
let selected;
try {
  selected = JSON.parse(selectedSource ?? "");
  if (!Array.isArray(selected) || selected.length === 0 || selected.some(value => typeof value !== "string" || value.length === 0)) {
    failures.push("selected validation is empty or invalid");
  }
} catch {
  failures.push("selected validation output is missing or malformed");
}

if (failures.length > 0) {
  process.stderr.write(`Development validation is not acceptable:\n${failures.map(failure => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Development validation accepted: ${selected.join(", ")}\n`);
