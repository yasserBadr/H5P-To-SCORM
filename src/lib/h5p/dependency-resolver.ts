import { cp, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export interface H5PDependency {
  machineName: string;
  majorVersion: number;
  minorVersion: number;
}

interface H5PLibrary extends H5PDependency {
  patchVersion?: number;
  preloadedDependencies?: H5PDependency[];
  dynamicDependencies?: H5PDependency[];
  preloadedJs?: Array<{ path: string }>;
  preloadedCss?: Array<{ path: string }>;
}

interface InstalledLibrary {
  metadata: H5PLibrary;
  directoryName: string;
}

async function discoverLibraries(directory: string) {
  const libraries = new Map<string, InstalledLibrary>();
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "content") continue;
    try {
      const metadata: unknown = JSON.parse(
        await readFile(path.join(directory, entry.name, "library.json"), "utf8")
      );
      if (!isLibrary(metadata)) continue;
      const key = dependencyKey(metadata);
      if (libraries.has(key)) {
        throw new Error(`Duplicate H5P dependency: ${canonicalDirectoryName(metadata)}`);
      }
      libraries.set(key, { metadata, directoryName: entry.name });
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Invalid library.json in ${entry.name}`);
      if (error instanceof Error && error.message.startsWith("Duplicate H5P dependency:")) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
    }
  }
  return libraries;
}

const dependencyKey = (dependency: H5PDependency) =>
  `${dependency.machineName}@${dependency.majorVersion}.${dependency.minorVersion}`;

const canonicalDirectoryName = (dependency: H5PDependency) =>
  `${dependency.machineName}-${dependency.majorVersion}.${dependency.minorVersion}`;

function isLibrary(value: unknown): value is H5PLibrary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<H5PLibrary>;
  return typeof candidate.machineName === "string" &&
    Number.isInteger(candidate.majorVersion) &&
    Number.isInteger(candidate.minorVersion);
}

function contentLibraryDependencies(value: unknown) {
  const found = new Map<string, H5PDependency>();
  function visit(current: unknown): void {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (key === "library" && typeof child === "string") {
        const match = /^([A-Za-z0-9_.-]+)\s+(\d+)\.(\d+)$/.exec(child.trim());
        if (match) {
          const dependency = {
            machineName: match[1],
            majorVersion: Number(match[2]),
            minorVersion: Number(match[3])
          };
          found.set(dependencyKey(dependency), dependency);
        }
      }
      visit(child);
    }
  }
  visit(value);
  return [...found.values()];
}

export async function prepareH5PPackage(packageDirectory: string) {
  const h5pPath = path.join(packageDirectory, "h5p.json");
  const h5p = JSON.parse(await readFile(h5pPath, "utf8")) as Record<string, unknown> & {
    preloadedDependencies?: H5PDependency[];
    dynamicDependencies?: H5PDependency[];
  };
  const content = JSON.parse(await readFile(path.join(packageDirectory, "content", "content.json"), "utf8"));
  const preloaded = [...(h5p.preloadedDependencies ?? [])];
  const dynamic = [...(h5p.dynamicDependencies ?? [])];
  const declared = new Set([...preloaded, ...dynamic].map(dependencyKey));
  let changed = false;
  for (const dependency of contentLibraryDependencies(content)) {
    const key = dependencyKey(dependency);
    if (declared.has(key)) continue;
    preloaded.push(dependency);
    declared.add(key);
    changed = true;
  }
  if (changed) {
    h5p.preloadedDependencies = preloaded;
    await writeFile(h5pPath, JSON.stringify(h5p, null, 2), "utf8");
  }
  return resolveH5PDependencies(packageDirectory, [...preloaded, ...dynamic]);
}

async function validateLibraryAssets(directory: string, metadata: H5PLibrary) {
  const root = path.resolve(directory);
  for (const asset of [...(metadata.preloadedJs ?? []), ...(metadata.preloadedCss ?? [])]) {
    if (!asset || typeof asset.path !== "string") continue;
    const normalized = asset.path.replace(/\\/g, "/");
    const target = path.resolve(root, ...normalized.split("/").filter(Boolean));
    if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..") ||
        (target !== root && !target.startsWith(root + path.sep))) {
      throw new Error(`Invalid H5P library asset path: ${canonicalDirectoryName(metadata)}/${asset.path}`);
    }
    try {
      if (!(await stat(target)).isFile()) throw new Error("Not a file");
    } catch {
      throw new Error(`H5P library asset is missing: ${canonicalDirectoryName(metadata)}/${normalized}`);
    }
  }
}

/**
 * Discovers libraries from library.json instead of trusting directory names.
 * It also normalizes patch-suffixed folders (for example 1.27.9) to the
 * major/minor convention required by h5p-standalone (1.27).
 */
export async function resolveH5PDependencies(
  packageDirectory: string,
  requestedDependencies: H5PDependency[],
  libraryCacheDirectory: string | null = process.env.H5P_LIBRARY_CACHE_DIR ||
    path.join(process.cwd(), "vendor", "h5p-libraries")
) {
  const installed = await discoverLibraries(packageDirectory);
  let cached = new Map<string, InstalledLibrary>();
  if (libraryCacheDirectory) {
    try { cached = await discoverLibraries(libraryCacheDirectory); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  const resolved = new Set<string>();
  const resolving = new Set<string>();
  async function visit(dependency: H5PDependency): Promise<void> {
    const key = dependencyKey(dependency);
    if (resolved.has(key)) return;
    if (resolving.has(key)) throw new Error(`Cyclic H5P dependency: ${canonicalDirectoryName(dependency)}`);
    let library = installed.get(key);
    if (!library && libraryCacheDirectory) {
      const cachedLibrary = cached.get(key);
      if (cachedLibrary) {
        const canonicalName = canonicalDirectoryName(cachedLibrary.metadata);
        await cp(
          path.join(libraryCacheDirectory, cachedLibrary.directoryName),
          path.join(packageDirectory, canonicalName),
          { recursive: true, errorOnExist: true, force: false }
        );
        library = { metadata: cachedLibrary.metadata, directoryName: canonicalName };
        installed.set(key, library);
      }
    }
    if (!library) throw new Error(`Required H5P dependency is missing: ${canonicalDirectoryName(dependency)}`);

    try {
      await validateLibraryAssets(path.join(packageDirectory, library.directoryName), library.metadata);
    } catch (installedError) {
      const cachedLibrary = libraryCacheDirectory ? cached.get(key) : undefined;
      if (!cachedLibrary || !libraryCacheDirectory) throw installedError;
      await validateLibraryAssets(
        path.join(libraryCacheDirectory, cachedLibrary.directoryName),
        cachedLibrary.metadata
      );
      await cp(
        path.join(libraryCacheDirectory, cachedLibrary.directoryName),
        path.join(packageDirectory, library.directoryName),
        { recursive: true, force: true }
      );
      library = { metadata: cachedLibrary.metadata, directoryName: library.directoryName };
      installed.set(key, library);
      await validateLibraryAssets(path.join(packageDirectory, library.directoryName), library.metadata);
    }
    resolving.add(key);
    for (const child of [
      ...(library.metadata.preloadedDependencies ?? []),
      ...(library.metadata.dynamicDependencies ?? [])
    ]) await visit(child);
    resolving.delete(key);
    resolved.add(key);
  }
  for (const dependency of requestedDependencies) await visit(dependency);

  // The standalone runtime derives paths from machineName-major.minor. Rename
  // alternate folder names only after the full graph has passed validation.
  for (const key of resolved) {
    const library = installed.get(key)!;
    const canonicalName = canonicalDirectoryName(library.metadata);
    if (library.directoryName !== canonicalName) {
      await rename(
        path.join(packageDirectory, library.directoryName),
        path.join(packageDirectory, canonicalName)
      );
      library.directoryName = canonicalName;
    }
  }

  return [...resolved].map((key) => installed.get(key)!.metadata);
}
