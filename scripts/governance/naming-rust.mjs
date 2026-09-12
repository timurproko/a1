/** Tokenize Rust source without treating raw strings, comments, characters, or lifetimes as code names. */
export function rustTokens(source) {
  const tokens = [];
  let index = 0;
  const fail = message => { throw new Error(`${message} at offset ${index}`); };
  while (index < source.length) {
    const start = index;
    const rest = source.slice(index);
    if (/^\s/.test(rest)) { index++; continue; }
    if (rest.startsWith("//")) { const end = source.indexOf("\n", index); index = end < 0 ? source.length : end; continue; }
    if (rest.startsWith("/*")) {
      index += 2;
      let depth = 1;
      while (depth > 0 && index < source.length) {
        if (source.startsWith("/*", index)) { depth++; index += 2; }
        else if (source.startsWith("*/", index)) { depth--; index += 2; }
        else index++;
      }
      if (depth) fail("unterminated Rust block comment");
      continue;
    }
    const raw = /^(?:br|cr|r)(#*)"/.exec(rest);
    if (raw) {
      const contentStart = index + raw[0].length;
      const end = source.indexOf(`"${raw[1]}`, contentStart);
      if (end < 0) fail("unterminated Rust raw string");
      tokens.push({ kind: "string", text: source.slice(contentStart, end), start });
      index = end + 1 + raw[1].length;
      continue;
    }
    const quoted = /^(?:b|c)?"/.exec(rest);
    if (quoted) {
      index += quoted[0].length;
      let text = "";
      let closed = false;
      while (index < source.length) {
        const char = source[index++];
        if (char === '"') { closed = true; break; }
        if (char === "\\") {
          if (index === source.length) fail("unterminated Rust escape");
          const escaped = source[index++];
          if (escaped === "x") {
            const hex = source.slice(index, index + 2);
            if (!/^[a-f0-9]{2}$/i.test(hex)) fail("invalid Rust byte escape");
            text += String.fromCharCode(parseInt(hex, 16)); index += 2;
          } else if (escaped === "u" && source[index] === "{") {
            const end = source.indexOf("}", index);
            if (end < 0) fail("unterminated Rust Unicode escape");
            const hex = source.slice(index + 1, end).replaceAll("_", "");
            if (!/^[a-f0-9]{1,6}$/i.test(hex)) fail("invalid Rust Unicode escape");
            text += String.fromCodePoint(parseInt(hex, 16)); index = end + 1;
          } else text += ({ n: "\n", r: "\r", t: "\t", "0": "\0" })[escaped] ?? escaped;
        } else text += char;
      }
      if (!closed) fail("unterminated Rust string");
      tokens.push({ kind: "string", text, start });
      continue;
    }
    const character = /^(?:b)?'(?:\\(?:u\{[a-fA-F0-9_]+\}|x[a-fA-F0-9]{2}|[^\r\n])|[^'\\\r\n])'/u.exec(rest);
    if (character) { index += character[0].length; continue; }
    const lifetime = /^'[\p{ID_Start}_][\p{ID_Continue}_]*/u.exec(rest);
    if (lifetime) { tokens.push({ kind: "identifier", text: lifetime[0].slice(1), start }); index += lifetime[0].length; continue; }
    const identifier = /^(?:r#)?[\p{ID_Start}_][\p{ID_Continue}_]*/u.exec(rest);
    if (identifier) { tokens.push({ kind: "identifier", text: identifier[0].replace(/^r#/, ""), start }); index += identifier[0].length; continue; }
    const number = /^(?:0[xX][a-fA-F0-9_]+|0[bB][01_]+|0[oO][0-7_]+|[0-9][0-9_]*(?:\.[0-9][0-9_]*)?(?:[eE][+-]?[0-9_]+)?)(?:[iu](?:8|16|32|64|128|size)|f(?:32|64))?/.exec(rest);
    if (number) { index += number[0].length; continue; }
    if (rest[0] === "'") fail("unsupported Rust character or lifetime");
    if (!/[{}()[\];:,.!#$%&*+\-/<=>?@^|~]/.test(rest[0])) fail("unsupported Rust token");
    tokens.push({ kind: "punctuation", text: rest[0], start }); index++;
  }
  const delimiters = [];
  for (const token of tokens) {
    if (token.kind !== "punctuation") continue;
    if (["{", "[", "("].includes(token.text)) delimiters.push(token.text);
    if (["}", "]", ")"].includes(token.text) && delimiters.pop() !== ({ "}": "{", "]": "[", ")": "(" })[token.text]) fail("unbalanced Rust delimiter");
  }
  if (delimiters.length) fail("unterminated Rust delimiter");
  return tokens;
}

/** Inspect tokenized native names and literal environment keys with exact exposure evidence. */
export function inspectRustNames(path, source, policy) {
  const internal = [], external = [];
  try {
    for (const token of rustTokens(source)) {
      const name = token.text;
      if (token.kind === "identifier" && /a1/i.test(name)) internal.push(finding(path, source, token.start, name, "NAME001", "branded native identifier"));
      if (token.kind === "string" && /^A1_[A-Z0-9_]+$/i.test(name)) {
        const entry = policy.environment.find(value => value.key === name && ["public", "integration", "review"].includes(value.exposure));
        const value = finding(path, source, token.start, name, "ENV001", "unapproved branded environment key");
        (entry ? external : internal).push(value);
      }
    }
  } catch (error) { internal.push(finding(path, source, 0, "<syntax>", "NAME002", error.message)); }
  return { internal, external };
}

function finding(path, source, offset, identifier, rule, message) {
  return { path, line: source.slice(0, offset).split("\n").length, identifier, rule, message };
}
