// Provenance: wording/layout adapted from Pi 0.84.2 packages/coding-agent/src/package-manager-cli.ts
// at 914cf1472e715297caa30db4b9535d534a9eb718 (MIT); grammar is restricted to A1's supported subset.
import chalk from "chalk";
import { PRODUCT_TEXT } from "../product-identity.js";

/** Supported subset of pinned Pi's package-manager CLI presentation. */
export type PackageCliVerb = "install" | "remove" | "list" | "update";
export type PackageSyntaxDiagnostic =
  | { readonly verb: PackageCliVerb; readonly kind: "missing-source" }
  | { readonly verb: PackageCliVerb; readonly kind: "unknown-option"; readonly value: string }
  | { readonly verb: PackageCliVerb; readonly kind: "unexpected-argument"; readonly value: string }
  | { readonly verb: "update"; readonly kind: "conflict"; readonly message: string };

type MessageStyle = Pick<typeof chalk, "red" | "dim" | "bold">;

export function packageCommandUsage(verb: PackageCliVerb): string {
  const command = `${PRODUCT_TEXT.commandName} pi ${verb}`;
  if (verb === "install" || verb === "remove") return `${command} <source>`;
  if (verb === "update") return `${command} [source|--extensions|--models]`;
  return command;
}

/** Diagnostic facts stay unstyled until the terminal boundary decides color support. */
export function renderPackageSyntax(diagnostic: PackageSyntaxDiagnostic, style: MessageStyle = chalk): string {
  const usage = packageCommandUsage(diagnostic.verb);
  let message: string;
  if (diagnostic.kind === "unknown-option") {
    return `${style.red(`Unknown option ${diagnostic.value} for "${diagnostic.verb}".`)}\n`
      + `${style.dim(`Use "${PRODUCT_TEXT.commandName} --help" or "${usage}".`)}\n`;
  }
  if (diagnostic.kind === "missing-source") message = `Missing ${diagnostic.verb} source.`;
  else if (diagnostic.kind === "unexpected-argument") message = `Unexpected argument ${diagnostic.value}.`;
  else message = diagnostic.message;
  return `${style.red(message)}\n${style.dim(`Usage: ${usage}`)}\n`;
}

/** Pi's help layout, with unsupported options and examples deliberately absent. */
export function packageCommandHelp(verb: PackageCliVerb, style: MessageStyle = chalk): string {
  const command = `${PRODUCT_TEXT.commandName} pi`;
  const header = `${style.bold("Usage:")}\n  ${packageCommandUsage(verb)}\n\n`;
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
      return header + `Update installed packages or model catalogs.

Options:
  --extensions            Update installed packages only
  --models                Refresh model catalogs only

Short forms:
  ${command} update --extensions   Update installed packages only
  ${command} update --models       Refresh model catalogs only
  ${command} update <source>       Update one package

`;
  }
}
