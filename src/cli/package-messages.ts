// Provenance: wording/layout adapted from Pi 0.84.2 packages/coding-agent/src/package-manager-cli.ts
// at 914cf1472e715297caa30db4b9535d534a9eb718 (MIT); grammar is restricted to A1's supported subset.
import chalk from "chalk";
import { PRODUCT_TEXT } from "../product-identity.js";

/** Supported subset of pinned Pi's package-manager CLI presentation. */
export type PackageCliVerb = "install" | "remove" | "list" | "update";
export type PackageCommandNamespace = "direct" | "pi";
export type PackageSyntaxDiagnostic =
  | { readonly verb: PackageCliVerb; readonly kind: "missing-source" }
  | { readonly verb: PackageCliVerb; readonly kind: "unknown-option"; readonly value: string }
  | { readonly verb: PackageCliVerb; readonly kind: "unexpected-argument"; readonly value: string }
  | { readonly verb: "update"; readonly kind: "conflict"; readonly message: string };

type MessageStyle = Pick<typeof chalk, "red" | "dim" | "bold">;

export function packageCommandUsage(verb: PackageCliVerb, namespace: PackageCommandNamespace = "pi"): string {
  const command = namespace === "direct"
    ? `${PRODUCT_TEXT.commandName} ${verb}`
    : `${PRODUCT_TEXT.commandName} pi ${verb}`;
  if (verb === "install" || verb === "remove") return `${command} <source>`;
  if (verb === "update" && namespace === "direct") {
    return `${command} [--develop [preview-or-version]|--models|--extensions|source]`;
  }
  if (verb === "update") return `${command} [source|--extensions|--models]`;
  return command;
}

/** Diagnostic facts stay unstyled until the terminal boundary decides color support. */
export function renderPackageSyntax(
  diagnostic: PackageSyntaxDiagnostic,
  namespace: PackageCommandNamespace = "pi",
  style: MessageStyle = chalk,
): string {
  const usage = packageCommandUsage(diagnostic.verb, namespace);
  let message: string;
  if (diagnostic.kind === "unknown-option") {
    return `${style.red(`Unknown option ${diagnostic.value} for "${diagnostic.verb}".`)}\n`
      + `${style.dim(`Use "${PRODUCT_TEXT.commandName} help" or "${usage}".`)}\n`;
  }
  if (diagnostic.kind === "missing-source") message = `Missing ${diagnostic.verb} source.`;
  else if (diagnostic.kind === "unexpected-argument") message = `Unexpected argument ${diagnostic.value}.`;
  else message = diagnostic.message;
  return `${style.red(message)}\n${style.dim(`Usage: ${usage}`)}\n`;
}

/** Pi's help layout, with unsupported options and examples deliberately absent. */
export function packageCommandHelp(
  verb: PackageCliVerb,
  namespace: PackageCommandNamespace = "pi",
  style: MessageStyle = chalk,
): string {
  const command = namespace === "direct" ? PRODUCT_TEXT.commandName : `${PRODUCT_TEXT.commandName} pi`;
  const header = verb === "update" && namespace === "direct"
    ? `${style.bold("Usage:")}\n`
      + `  ${command} update\n`
      + `  ${command} update --develop [preview-or-version]\n`
      + `  ${command} update --models\n`
      + `  ${command} update --extensions\n`
      + `  ${command} update <source>\n\n`
    : `${style.bold("Usage:")}\n  ${packageCommandUsage(verb, namespace)}\n\n`;
  switch (verb) {
    case "install":
      return header + `Install a package and add it to settings.

Examples:
  ${command} install npm:@foo/bar
  ${command} install git:github.com/user/repo
  ${command} install git:git@github.com:user/repo
  ${command} install https://github.com/user/repo
  ${command} install ssh://git@github.com/user/repo
  ${command} install ./local/path

`;
    case "remove":
      return header + `Remove a package and its source from settings.
Alias: ${command} uninstall <source>

Examples:
  ${command} remove npm:@foo/bar
  ${command} uninstall npm:@foo/bar

`;
    case "list":
      return header + "List installed packages from user settings.\n\n";
    case "update":
      return header + `${namespace === "direct" ? "Update A1, installed packages, or model catalogs." : "Update installed packages or model catalogs."}

Options:
${namespace === "direct" ? "  --develop [target]     Update to the development channel or one preview\n" : ""}  --extensions            Update installed packages only
  --models                Refresh model catalogs only

Short forms:
${namespace === "direct" ? `  ${command} update                Update A1 to the stable release\n  ${command} update --develop      Update A1 to the development preview\n` : ""}  ${command} update --extensions   Update installed packages only
  ${command} update --models       Refresh model catalogs only
  ${command} update <source>       Update one package

`;
  }
}
