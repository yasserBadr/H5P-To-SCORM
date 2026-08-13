import { ZipArchive } from "archiver";
import { createWriteStream } from "node:fs";
import { cp, mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { jobDir, readMeta, validJobId } from "@/lib/jobs/storage";
import { prepareH5PPackage } from "@/lib/h5p/dependency-resolver";
import { LAUNCH_WARNING_CSS } from "./extra-css";
import { H5P_RUNTIME_DIRECTORY, indexHtml, manifestXml, PACKAGE_README, PLAYER_CSS, PLAYER_JS, PLAYER_RESPONSIVE_CSS, SCORM_12_JS, SCORM_BUILD, type ScormCourse } from "./templates";

export type ScormSettings = {
  jobIds: string[];
  courseTitle: string;
  passingScore: number;
  navigation: ScormCourse["navigation"];
  completionRule: ScormCourse["completionRule"];
  playerBackground: string;
  playerAccent: string;
};

const safeColor = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;

async function listFiles(root: string, directory = root): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listFiles(root, absolute));
    else if (entry.isFile()) found.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return found;
}

function safeDownloadName(title: string) {
  const ascii = title.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  const build = SCORM_BUILD.replace(/[^a-zA-Z0-9.-]+/g, "-");
  return `${ascii || "H5P_Course"}_SCORM_1.2_build-${build}.zip`;
}

async function zipDirectory(source: string, target: string) {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(target, { flags: "wx" });
    const archive = new ZipArchive({ zlib: { level: 6 } });
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("warning", (error) => error.code === "ENOENT" ? undefined : reject(error));
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(source, false);
    void archive.finalize();
  });
}

export async function generateScormPackage(settings: ScormSettings) {
  const uniqueJobIds = [...new Set(settings.jobIds)];
  if (!uniqueJobIds.length || uniqueJobIds.length > 50 || uniqueJobIds.some((id) => !validJobId(id))) {
    throw new Error("قائمة ملفات H5P غير صالحة.");
  }

  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "h5p-scorm-build-"));
  const packageDirectory = path.join(temporaryDirectory, "package");
  const zipPath = path.join(temporaryDirectory, "course.zip");
  await mkdir(packageDirectory);

  const contents: ScormCourse["contents"] = [];
  for (let index = 0; index < uniqueJobIds.length; index += 1) {
    const jobId = uniqueJobIds[index];
    const meta = await readMeta(jobId);
    const folder = `content-${String(index + 1).padStart(3, "0")}`;
    const contentDirectory = path.join(packageDirectory, "h5p", folder);
    await cp(path.join(jobDir(jobId), "content"), contentDirectory, { recursive: true });
    await prepareH5PPackage(contentDirectory);
    contents.push({ id: jobId, title: meta.title, path: `h5p/${folder}` });
  }

  const course: ScormCourse = {
    title: settings.courseTitle.trim().slice(0, 200) || "H5P Interactive Video Course",
    passingScore: Math.max(0, Math.min(100, Math.round(settings.passingScore))),
    navigation: settings.navigation,
    completionRule: settings.completionRule,
    theme: {
      background: safeColor(settings.playerBackground, "#07111f"),
      accent: safeColor(settings.playerAccent, "#65e1b8")
    },
    contents
  };

  await mkdir(path.join(packageDirectory, "course"), { recursive: true });
  await mkdir(path.join(packageDirectory, "player"), { recursive: true });
  await mkdir(path.join(packageDirectory, "scorm"), { recursive: true });
  await mkdir(path.join(packageDirectory, "assets"), { recursive: true });
  await cp(
    path.join(process.cwd(), "node_modules", "h5p-standalone", "dist"),
    path.join(packageDirectory, "assets", H5P_RUNTIME_DIRECTORY),
    { recursive: true }
  );
  await Promise.all([
    writeFile(path.join(packageDirectory, "index.html"), indexHtml(course), "utf8"),
    writeFile(path.join(packageDirectory, "course", "course.json"), JSON.stringify(course, null, 2), "utf8"),
    writeFile(path.join(packageDirectory, "player", "player.js"), PLAYER_JS, "utf8"),
    writeFile(path.join(packageDirectory, "player", "player.css"), PLAYER_CSS + PLAYER_RESPONSIVE_CSS + LAUNCH_WARNING_CSS, "utf8"),
    writeFile(path.join(packageDirectory, "scorm", "scorm12.js"), SCORM_12_JS, "utf8"),
    writeFile(path.join(packageDirectory, "SCORM-README.txt"), PACKAGE_README, "utf8")
  ]);

  const files = (await listFiles(packageDirectory)).sort();
  await writeFile(path.join(packageDirectory, "imsmanifest.xml"), manifestXml(course.title, files), "utf8");
  await zipDirectory(packageDirectory, zipPath);
  return { zipPath, temporaryDirectory, fileName: safeDownloadName(course.title) };
}
