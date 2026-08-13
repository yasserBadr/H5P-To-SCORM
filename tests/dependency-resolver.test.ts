import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prepareH5PPackage, resolveH5PDependencies } from "../src/lib/h5p/dependency-resolver";

const temporaryDirectories: string[] = [];
afterEach(async () => Promise.all(temporaryDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))));

async function library(root: string, folder: string, metadata: Record<string, unknown>) {
  const directory = path.join(root, folder);
  await mkdir(directory);
  await writeFile(path.join(directory, "library.json"), JSON.stringify(metadata));
}

describe("H5P dependency resolver", () => {
  it("accepts and normalizes a patch-suffixed library directory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    temporaryDirectories.push(root);
    await library(root, "H5P.InteractiveVideo-1.27.9", {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27, patchVersion: 9
    });

    await expect(resolveH5PDependencies(root, [{
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    }], null)).resolves.toHaveLength(1);

    await expect(readFileExists(path.join(root, "H5P.InteractiveVideo-1.27", "library.json"))).resolves.toBe(true);
  });

  it("reports a genuinely missing transitive dependency", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    temporaryDirectories.push(root);
    await library(root, "H5P.InteractiveVideo-1.27", {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27,
      preloadedDependencies: [{ machineName: "H5P.Video", majorVersion: 1, minorVersion: 6 }]
    });
    await expect(resolveH5PDependencies(root, [{
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    }], null)).rejects.toThrow("Required H5P dependency is missing: H5P.Video-1.6");
  });

  it("fills missing dependencies from the local library cache", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    const cache = await mkdtemp(path.join(os.tmpdir(), "h5p-cache-"));
    temporaryDirectories.push(root, cache);
    await library(cache, "H5P.InteractiveVideo-1.27.9", {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27, patchVersion: 9
    });

    await expect(resolveH5PDependencies(root, [{
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    }], cache)).resolves.toHaveLength(1);
    await expect(readFileExists(path.join(root, "H5P.InteractiveVideo-1.27", "library.json"))).resolves.toBe(true);
  });

  it("rejects a library whose declared player asset is missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    temporaryDirectories.push(root);
    await library(root, "H5P.InteractiveVideo-1.27", {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27,
      preloadedJs: [{ path: "dist/h5p-interactive-video.js" }]
    });

    await expect(resolveH5PDependencies(root, [{
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    }], null)).rejects.toThrow(
      "H5P library asset is missing: H5P.InteractiveVideo-1.27/dist/h5p-interactive-video.js"
    );
  });

  it("repairs a missing player asset from a complete local cache", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    const cache = await mkdtemp(path.join(os.tmpdir(), "h5p-cache-"));
    temporaryDirectories.push(root, cache);
    const metadata = {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27,
      preloadedJs: [{ path: "dist/h5p-interactive-video.js" }]
    };
    await library(root, "H5P.InteractiveVideo-1.27", metadata);
    await library(cache, "H5P.InteractiveVideo-1.27", metadata);
    await mkdir(path.join(cache, "H5P.InteractiveVideo-1.27", "dist"));
    await writeFile(path.join(cache, "H5P.InteractiveVideo-1.27", "dist", "h5p-interactive-video.js"), "window.H5P = window.H5P || {};");

    await expect(resolveH5PDependencies(root, [{
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    }], cache)).resolves.toHaveLength(1);
    await expect(readFileExists(path.join(root, "H5P.InteractiveVideo-1.27", "dist", "h5p-interactive-video.js"))).resolves.toBe(true);
  });

  it("adds content-specific libraries that a malformed h5p.json omitted", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "h5p-resolver-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "content"));
    await writeFile(path.join(root, "h5p.json"), JSON.stringify({
      preloadedDependencies: [{ machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27 }]
    }));
    await writeFile(path.join(root, "content", "content.json"), JSON.stringify({
      interaction: { library: "H5P.Text 1.1", params: {} }
    }));
    await library(root, "H5P.InteractiveVideo-1.27", {
      machineName: "H5P.InteractiveVideo", majorVersion: 1, minorVersion: 27
    });
    await library(root, "H5P.Text-1.1", {
      machineName: "H5P.Text", majorVersion: 1, minorVersion: 1
    });

    await expect(prepareH5PPackage(root)).resolves.toHaveLength(2);
    const manifest = JSON.parse(await readFile(path.join(root, "h5p.json"), "utf8"));
    expect(manifest.preloadedDependencies).toContainEqual({
      machineName: "H5P.Text", majorVersion: 1, minorVersion: 1
    });
  });
});

async function readFileExists(file: string) {
  try { await import("node:fs/promises").then(({ access }) => access(file)); return true; }
  catch { return false; }
}
