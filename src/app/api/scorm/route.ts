import { createReadStream } from "node:fs";
import { rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { generateScormPackage, type ScormSettings } from "@/lib/scorm/generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const navigations = new Set<ScormSettings["navigation"]>(["free", "sequential"]);
const rules = new Set<ScormSettings["completionRule"]>(["all_completed", "all_visited", "passing_score", "all_required"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobIds = url.searchParams.getAll("job");
  const navigation = url.searchParams.get("navigation") as ScormSettings["navigation"];
  const completionRule = url.searchParams.get("completionRule") as ScormSettings["completionRule"];
  const passingScore = Number(url.searchParams.get("passingScore") ?? 70);
  try {
    const generated = await generateScormPackage({
      jobIds,
      courseTitle: url.searchParams.get("title") || "H5P Course",
      passingScore: Number.isFinite(passingScore) ? passingScore : 70,
      navigation: navigations.has(navigation) ? navigation : "free",
      completionRule: rules.has(completionRule) ? completionRule : "all_completed"
    });
    const size = (await stat(generated.zipPath)).size;
    const source = createReadStream(generated.zipPath);
    source.once("close", () => void rm(generated.temporaryDirectory, { recursive: true, force: true }));
    source.once("error", () => void rm(generated.temporaryDirectory, { recursive: true, force: true }));
    return new Response(Readable.toWeb(source) as ReadableStream, {
      headers: {
        "content-type": "application/zip",
        "content-length": String(size),
        "content-disposition": `attachment; filename="${generated.fileName}"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إنشاء حزمة SCORM." }, { status: 422 });
  }
}
