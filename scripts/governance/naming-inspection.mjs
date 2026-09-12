import ts from "typescript";
import { parser as pythonParser } from "@lezer/python";
import { parseDocument, isMap, isSeq, isScalar } from "yaml";
import { inspectRustNames } from "./naming-rust.mjs";
import { namingSourceRole } from "./naming-source-policy.mjs";

/** Inspect decoded code names, not comments or source text embedded as ordinary test data. */
export function inspectScriptNames(path, source, policy) {
  const kind = /[.]tsx$/.test(path) ? ts.ScriptKind.TSX : /[.]jsx$/.test(path) ? ts.ScriptKind.JSX : /[.][cm]?ts$/.test(path) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
  const internal = [], external = [];
  const bindings = new Map();
  const add = (node, name, rule = "NAME001", message = "branded internal name", allowed = false) => {
    const value = { path, line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1, identifier: name, rule, message };
    (allowed ? external : internal).push(value);
  };
  for (const diagnostic of file.parseDiagnostics) {
    internal.push({ path, line: file.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line + 1, identifier: "<syntax>", rule: "NAME002", message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " ") });
  }
  if (internal.length) return { internal, external };
  const scope = node => {
    for (let parent = node.parent; parent; parent = parent.parent) if (ts.isBlock(parent) || ts.isSourceFile(parent) || ts.isFunctionLike(parent)) return parent;
    return file;
  };
  const collect = node => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && ts.isIdentifier(node.name)) {
      const owner = scope(node);
      if (!bindings.has(owner)) bindings.set(owner, new Map());
      bindings.get(owner).set(node.name.text, node);
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  const constant = (node, seen = new Set()) => {
    if (!node || seen.has(node)) return undefined;
    seen.add(node);
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return constant(node.expression, seen);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = constant(node.left, new Set(seen)), right = constant(node.right, new Set(seen));
      return left === undefined || right === undefined ? undefined : left + right;
    }
    if (ts.isIdentifier(node)) {
      for (let owner = scope(node); owner; owner = owner === file ? null : scope(owner)) {
        const declaration = bindings.get(owner)?.get(node.text);
        if (declaration) return ts.isVariableDeclaration(declaration) && declaration.parent.flags & ts.NodeFlags.Const ? constant(declaration.initializer, seen) : undefined;
      }
    }
    return undefined;
  };
  const externalKey = name => policy.environment.some(entry => entry.key === name && ["public", "integration", "review"].includes(entry.exposure));
  const externalMember = (node, name) => {
    if (ts.isPrivateIdentifier(node)) return false;
    const parent = node.parent;
    const member = (parent.name === node && (ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)))
      || (ts.isElementAccessExpression(parent) && parent.argumentExpression === node)
      || (ts.isPropertyAccessExpression(parent) && parent.name === node)
      || (ts.isImportSpecifier(parent) && parent.propertyName === node);
    return member && policy.externalMembers.some(entry => entry.path === path && entry.name === name);
  };
  const environmentExpression = node => {
    if (!node) return false;
    if (ts.isIdentifier(node)) return /^(?:env|environment|sourceEnvironment|childEnvironment|environmentOverrides)$/i.test(node.text);
    return ts.isPropertyAccessExpression(node) && /^(?:env|environment)$/i.test(node.name.text);
  };
  const environmentObject = object => {
    const parent = object.parent;
    if (ts.isPropertyAssignment(parent) && /^(?:env|environment)$/.test(parent.name.getText(file))) return true;
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) && /(?:^env$|environment)/i.test(parent.name.text)) return true;
    if (ts.isReturnStatement(parent)) {
      for (let ancestor = parent.parent; ancestor; ancestor = ancestor.parent) {
        if (ts.isFunctionDeclaration(ancestor) && /environment/i.test(ancestor.name?.text ?? "")) return true;
      }
    }
    if (ts.isCallExpression(parent)) {
      const callee = parent.expression.getText(file);
      if (/^(?:resolveProductPaths|resolveDevelopmentLaunchEnvironment|readLaunchContext|withLaunchContext|initializeStartupTrace)$/.test(callee)) return true;
      if (callee === "Object.assign" && environmentExpression(parent.arguments[0])) return true;
      if (/[.]to(?:Equal|MatchObject)$/.test(callee) && path.endsWith(".test.ts")) return true;
      const declaration = file.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === callee);
      const parameter = declaration?.parameters[parent.arguments.indexOf(object)];
      if (parameter && /env/i.test(parameter.name.getText(file))) return true;
    }
    if (ts.isVariableDeclaration(parent) && parent.name.getText(file) === "source") {
      let consumed = false;
      const find = node => {
        if (ts.isCallExpression(node) && /Environment$/.test(node.expression.getText(file)) && node.arguments.some(argument => argument.getText(file) === "source")) consumed = true;
        ts.forEachChild(node, find);
      };
      find(file);
      if (consumed) return true;
    }
    return false;
  };
  const environmentPosition = node => {
    const parent = node.parent;
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return environmentExpression(parent.expression);
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return environmentExpression(parent.expression);
    return ts.isPropertyAssignment(parent) && parent.name === node && environmentObject(parent.parent);
  };
  const visit = node => {
    if ((ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) && /a1/i.test(node.text)) {
      add(node, node.text, "NAME001", "branded internal name", externalMember(node, node.text) || (externalKey(node.text) && environmentPosition(node)));
    }
    if (ts.isStringLiteralLike(node)) {
      const parent = node.parent;
      const member = parent.name === node && (ts.isPropertyAssignment(parent) || ts.isMethodDeclaration(parent) || ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent) || ts.isMethodSignature(parent) || ts.isGetAccessor(parent) || ts.isSetAccessor(parent));
      if (member && /a1/i.test(node.text)) add(node, node.text, "NAME001", "branded member name", externalMember(node, node.text) || (externalKey(node.text) && environmentPosition(node)));
      const definition = ts.isVariableDeclaration(parent) && parent.initializer === node;
      if (/^A1_[A-Z0-9_]+$/i.test(node.text) && (definition || environmentPosition(node))) add(node, node.text, "ENV001", "unapproved branded environment key", externalKey(node.text));
    }
    if (ts.isComputedPropertyName(node) || ts.isElementAccessExpression(node)) {
      const expression = ts.isComputedPropertyName(node) ? node.expression : node.argumentExpression;
      const name = constant(expression);
      if (name && /a1/i.test(name)) {
        const allowed = (externalKey(name) && (ts.isElementAccessExpression(node) ? environmentExpression(node.expression) : ts.isPropertyAssignment(node.parent) && environmentObject(node.parent.parent)))
          || policy.externalMembers.some(entry => entry.path === path && entry.name === name) && ts.isElementAccessExpression(node);
        add(node, name, "NAME001", "branded computed member name", allowed);
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const name = constant(node.initializer);
      if (name && /^A1_[A-Z0-9_]+$/i.test(name) && !ts.isStringLiteralLike(node.initializer)) add(node.initializer, name, "ENV001", "unapproved constant environment key", externalKey(name));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { internal: unique(internal), external: unique(external) };
}

/** Inspect shell variable assignments/references and function names; external command words remain data. */
export function inspectShellNames(path, source, policy) {
  const internal = [], external = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (/^\s*#/.test(line)) continue;
    const names = [...line.matchAll(/(?:\$env:|\$\{?|(?:^|[\s"']))([A-Za-z_][A-Za-z0-9_]*)(?=\b(?:\s*=|\}|\b))/g)];
    for (const match of names) {
      const name = match[1];
      if (!/a1/i.test(name)) continue;
      const assignment = line.slice(match.index + match[0].length).trimStart().startsWith("=");
      if (!assignment && !match[0].includes("$")) continue;
      const allowed = policy.environment.some(entry => entry.key === name && ["public", "integration", "review"].includes(entry.exposure));
      (allowed ? external : internal).push({ path, line: index + 1, identifier: name, rule: "ENV001", message: "unapproved shell environment name" });
    }
    for (const match of line.matchAll(/^\s*(?:function|class)\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
      if (/a1/i.test(match[1])) internal.push({ path, line: index + 1, identifier: match[1], rule: "NAME001", message: "branded shell declaration" });
    }
    for (const match of line.matchAll(/(?:function\s+|^\s*)([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*\)/g)) {
      if (/a1/i.test(match[1])) internal.push({ path, line: index + 1, identifier: match[1], rule: "NAME001", message: "branded shell function" });
    }
  }
  return { internal: unique(internal), external: unique(external) };
}

/** Inspect structured environment definitions and embedded workflow scripts without scanning prose. */
export function inspectConfigurationNames(path, source, policy) {
  const internal = [], external = [];
  const document = parseDocument(source, { uniqueKeys: true, maxAliasCount: 0 });
  if (document.errors.length) return { internal: document.errors.map(error => ({ path, line: source.slice(0, error.pos?.[0] ?? 0).split("\n").length, identifier: "<syntax>", rule: "NAME002", message: error.message })), external };
  const check = (node, name) => {
    if (!/^A1_[A-Z0-9_]+$/i.test(name)) return;
    const allowed = policy.environment.some(entry => entry.key === name && ["public", "integration", "review"].includes(entry.exposure));
    (allowed ? external : internal).push({ path, line: source.slice(0, node.range?.[0] ?? 0).split("\n").length, identifier: name, rule: "ENV001", message: "unapproved environment definition" });
  };
  const visit = (node, role = "") => {
    if (isMap(node)) for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : "";
      if (["env", "environment"].includes(role)) check(pair.key, key);
      if (isScalar(pair.value) && typeof pair.value.value === "string" && (role === "environment" || /^A1_/i.test(pair.value.value))) check(pair.value, pair.value.value);
      if (key === "run" && isScalar(pair.value) && typeof pair.value.value === "string") {
        const script = pair.value.value;
        const result = inspectShellNames(path, script, policy);
        const offset = source.slice(0, pair.value.range?.[0] ?? 0).split("\n").length - 1;
        for (const name of ["internal", "external"]) for (const value of result[name]) ({ internal, external })[name].push({ ...value, line: value.line + offset });
        const heredoc = /<<['"]?([A-Z][A-Z0-9_]*)['"]?\s*\n([\s\S]*?)\n\1\b/g;
        for (const match of script.matchAll(heredoc)) {
          if (!script.slice(0, match.index).split("\n").at(-1).includes("node")) continue;
          const embedded = inspectScriptNames(path, match[2], policy);
          const scriptOffset = script.slice(0, match.index).split("\n").length;
          for (const name of ["internal", "external"]) for (const value of embedded[name]) ({ internal, external })[name].push({ ...value, line: value.line + offset + scriptOffset });
        }
      }
      visit(pair.value, key);
    }
    else if (isSeq(node)) for (const item of node.items) visit(item, role);
  };
  visit(document.contents);
  return { internal: unique(internal), external: unique(external) };
}

/** Parse Python fixtures with the bundled grammar, without requiring an installed interpreter. */
export function inspectPythonNames(path, source, policy) {
  const internal = [], external = [];
  pythonParser.parse(source).iterate({ enter(node) {
    const name = source.slice(node.from, node.to);
    const value = { path, line: source.slice(0, node.from).split("\n").length, identifier: name, rule: "NAME001", message: "branded Python name" };
    if (node.type.isError) internal.push({ ...value, identifier: "<syntax>", rule: "NAME002", message: "unsupported Python syntax" });
    else if (["VariableName", "PropertyName"].includes(node.name) && /a1/i.test(name)) internal.push(value);
    else if (node.name === "String") {
      const match = /^[rub]*(["'])([\s\S]*)\1$/i.exec(name);
      const key = match?.[2].replace(/\\(?:x([a-f0-9]{2})|u([a-f0-9]{4}))/gi, (_, byte, unicode) => String.fromCharCode(parseInt(byte ?? unicode, 16)));
      if (key && /^A1_[A-Z0-9_]+$/i.test(key)) {
        const allowed = policy.environment.some(entry => entry.key === key && ["public", "integration", "review"].includes(entry.exposure));
        (allowed ? external : internal).push({ ...value, identifier: key, rule: "ENV001", message: "unapproved Python environment key" });
      }
    }
  } });
  return { internal, external };
}

export function inspectNamingSource(path, source, policy) {
  const role = namingSourceRole(path);
  if (role === "script") return inspectScriptNames(path, source, policy);
  if (role === "rust") return inspectRustNames(path, source, policy);
  if (role === "python") return inspectPythonNames(path, source, policy);
  if (role === "configuration") return inspectConfigurationNames(path, source, policy);
  if (role === "shell") return inspectShellNames(path, source, policy);
  if (role === "unsupported") return { internal: [{ path, line: 1, identifier: "<syntax>", rule: "NAME002", message: "unsupported owned source" }], external: [] };
  return { internal: [], external: [] };
}

function unique(values) {
  return [...new Map(values.map(value => [`${value.path}\0${value.line}\0${value.identifier}\0${value.rule}`, value])).values()];
}
