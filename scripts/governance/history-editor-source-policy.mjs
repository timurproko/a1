import ts from "typescript";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const PRINTABLE_HELPER_PATH = "src/integrations/pi/components/upstream/history/printable-key.ts";
const NAMES = ["MODIFIERS", "LOCK_MASK", "ParsedModifyOtherKeysSequence", "parseModifyOtherKeysSequence", "decodeModifyOtherKeysPrintable", "decodePrintableKey"];

export function isExactPrintableHelper(source, upstream) {
  const ast = ts.createSourceFile("keys.ts", upstream, ts.ScriptTarget.Latest, true);
  const retained = ast.statements.filter(statement => NAMES.includes(statement.name?.text)
    || ts.isVariableStatement(statement) && statement.declarationList.declarations.some(value => NAMES.includes(value.name.getText(ast))));
  if (retained.length !== NAMES.length) return false;
  const expected = 'import { decodeKittyPrintable } from "#pi-tui";\n'
    + retained.map(statement => statement.getFullText(ast).trim()).join("\n\n") + "\n";
  return source.replace(/^\/\*\*[\s\S]*?\*\/\s*/, "").replaceAll("\r\n", "\n") === expected.replaceAll("\r\n", "\n");
}

export async function readPinnedKeySource() {
  const agent = import.meta.resolve("@earendil-works/pi-coding-agent");
  const terminal = createRequire(agent).resolve("@earendil-works/pi-tui");
  const map = JSON.parse(await readFile(join(dirname(terminal), "keys.js.map"), "utf8"));
  return map.sourcesContent[0];
}
