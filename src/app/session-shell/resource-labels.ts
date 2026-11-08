import type {
  OwnedUiExtensionResourceSummary,
  OwnedUiExtensionSourceSummary,
  OwnedUiSessionBackend,
  OwnedUiShellResourceEntry,
} from "../../contracts/owned-ui/index.js";

// Rationale: the startup header lists loaded resources with the shortest label that stays unambiguous.

export function shellResourceEntries(backend: OwnedUiSessionBackend): readonly OwnedUiShellResourceEntry[] {
  const resources: OwnedUiShellResourceEntry[] = backend.extensions.nonVisualResources().map(resource => ({
    section: resource.kind === "skill"
      ? "Skills"
      : resource.kind === "prompt-template"
        ? "Prompts"
        : resource.kind === "theme"
          ? "Themes"
          : "Context",
    label: resource.kind === "prompt-template"
      ? `/${resource.label}`
      : resource.kind === "agent-context" || resource.kind === "system-prompt"
        ? compactResourceLabel(resource.sourcePath ?? resource.label)
        : resource.label,
    sourcePath: resource.sourcePath,
    diagnostic: resource.diagnostic,
  }));
  const extensions = backend.extensions.extensionResources().filter(extension => !extension.hidden);
  const loadedExtensions = extensions.filter(extension => extension.diagnostic === null);
  const extensionLabels = compactExtensionLabels(loadedExtensions);
  for (const extension of extensions) {
    const labelIndex = loadedExtensions.indexOf(extension);
    resources.push({
      section: "Extensions",
      label: extensionLabels[labelIndex] ?? compactResourceLabel(extension.sourcePath ?? extension.resolvedPath ?? "extension"),
      sourcePath: extension.sourcePath ?? extension.resolvedPath,
      diagnostic: extension.diagnostic,
    });
  }
  return resources;
}

function compactResourceLabel(path: string): string {
  const segments = compactPathSegments(path);
  const leaf = segments.at(-1) ?? path;
  if ((leaf === "index.ts" || leaf === "index.js") && segments.length > 1) return segments.at(-2) ?? leaf;
  return leaf;
}

/**
 * Pinned from InteractiveMode's compact extension-label helpers at Pi commit
 * 914cf1472e715297caa30db4b9535d534a9eb718. The source metadata crosses an
 * A1-owned boundary first; the owned shell never inspects Pi's private root.
 */
function compactExtensionLabels(extensions: readonly OwnedUiExtensionResourceSummary[]): readonly string[] {
  const localExtensions = extensions
    .filter(extension => !isPackageExtensionSource(extension.sourceInfo))
    .map(extension => {
      const path = extension.sourcePath ?? extension.resolvedPath ?? "extension";
      const segments = compactPathSegments(path);
      if (segments.length > 1 && (segments.at(-1) === "index.ts" || segments.at(-1) === "index.js")) segments.pop();
      return { extension, segments };
    });

  return extensions.map(extension => {
    const resourcePath = extension.sourcePath ?? extension.resolvedPath ?? "extension";
    if (isPackageExtensionSource(extension.sourceInfo)) {
      return compactPackageExtensionLabel(resourcePath, extension.sourceInfo);
    }
    const localIndex = localExtensions.findIndex(item => item.extension === extension);
    const segments = localExtensions[localIndex]?.segments;
    if (!segments || segments.length === 0) return compactResourceLabel(resourcePath);
    for (let count = 1; count <= segments.length; count += 1) {
      const candidate = segments.slice(-count).join("/");
      if (localExtensions.every((item, itemIndex) => itemIndex === localIndex || item.segments.slice(-count).join("/") !== candidate)) {
        return candidate;
      }
    }
    return segments.join("/");
  });
}

function compactPackageExtensionLabel(resourcePath: string, sourceInfo: OwnedUiExtensionSourceSummary): string {
  const sourceLabel = compactPackageSourceLabel(sourceInfo.source);
  if (!sourceLabel) return compactResourceLabel(resourcePath);
  const shortPath = shortPackagePath(resourcePath, sourceInfo).replaceAll("\\", "/");
  const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
  const slash = packagePath.lastIndexOf("/");
  const fileName = slash < 0 ? packagePath : packagePath.slice(slash + 1);
  const directory = slash < 0 ? "" : packagePath.slice(0, slash);
  const extension = fileName.lastIndexOf(".");
  const name = extension <= 0 ? fileName : fileName.slice(0, extension);
  if (name === "index") return !directory || directory === "." ? sourceLabel : `${sourceLabel}:${directory}`;
  return `${sourceLabel}:${packagePath}`;
}

function compactPackageSourceLabel(source: string): string {
  if (source.startsWith("npm:")) return source.slice("npm:".length) || source;
  if (!source.startsWith("git:")) return source;
  const gitSource = source.slice("git:".length).trim();
  let repositoryPath: string | undefined;
  const scpLike = gitSource.match(/^git@[^:]+:(.+)$/);
  if (scpLike?.[1]) {
    repositoryPath = scpLike[1];
  } else if (/^[a-z]+:\/\//i.test(gitSource)) {
    try {
      repositoryPath = new URL(gitSource).pathname.replace(/^\/+/, "");
    } catch {
      return source;
    }
  } else {
    const slash = gitSource.indexOf("/");
    if (slash >= 0) repositoryPath = gitSource.slice(slash + 1);
  }
  if (!repositoryPath) return source;
  const ref = repositoryPath.indexOf("@");
  const withoutRef = ref < 0 ? repositoryPath : repositoryPath.slice(0, ref);
  return withoutRef.replace(/\.git$/, "") || source;
}

function shortPackagePath(resourcePath: string, sourceInfo: OwnedUiExtensionSourceSummary): string {
  const fullPath = normalizeResourcePath(resourcePath);
  const baseDir = sourceInfo.baseDir === null ? undefined : normalizeResourcePath(sourceInfo.baseDir).replace(/\/$/, "");
  if (baseDir) {
    const npmRoot = baseDir.match(/^(.*\/node_modules)\/(@?[^/]+(?:\/[^/]+)?)$/);
    if (npmRoot?.[1] && fullPath.startsWith(`${npmRoot[1]}/`)) return relativeResourcePath(baseDir, fullPath);
    if (fullPath === baseDir) return ".";
    if (fullPath.startsWith(`${baseDir}/`)) return fullPath.slice(baseDir.length + 1);
  }
  const npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
  if (npmMatch?.[2] && sourceInfo.source.startsWith("npm:")) return npmMatch[2];
  const gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
  if (gitMatch?.[1] && sourceInfo.source.startsWith("git:")) return gitMatch[1];
  return resourcePath;
}

function relativeResourcePath(from: string, to: string): string {
  const fromSegments = from.split("/").filter(Boolean);
  const toSegments = to.split("/").filter(Boolean);
  let common = 0;
  while (common < fromSegments.length && common < toSegments.length
    && fromSegments[common]?.toLowerCase() === toSegments[common]?.toLowerCase()) common += 1;
  return [...fromSegments.slice(common).map(() => ".."), ...toSegments.slice(common)].join("/") || ".";
}

function compactPathSegments(path: string): string[] {
  return normalizeResourcePath(path).split("/").filter(segment => segment.length > 0 && segment !== "~");
}

function normalizeResourcePath(path: string): string {
  return path.replaceAll("\\", "/");
}

function isPackageExtensionSource(sourceInfo: OwnedUiExtensionSourceSummary | null): sourceInfo is OwnedUiExtensionSourceSummary {
  const source = sourceInfo?.source ?? "";
  return source.startsWith("npm:") || source.startsWith("git:");
}

// Performance: one painter set per root keeps identities stable, so the neutral viewport retains row-level
// selection variants while each callback still resolves the live theme.
