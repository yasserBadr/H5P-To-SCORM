import { jobDir, readMeta, validJobId } from "@/lib/jobs/storage";
import { prepareH5PPackage } from "@/lib/h5p/dependency-resolver";
import path from "node:path";
import { notFound } from "next/navigation";
import PreviewPlayer from "./player";

export const dynamic = "force-dynamic";

export default async function Preview({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!validJobId(jobId)) notFound();
  let meta;
  try {
    meta = await readMeta(jobId);
    const contentDirectory = path.join(jobDir(jobId), "content");
    await prepareH5PPackage(contentDirectory);
  } catch { notFound(); }
  return <main style={{ maxWidth: 1200, margin: "auto", padding: 24 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
      <div><div className="brand">H5P PREVIEW</div><h2 style={{ margin: "8px 0 0" }}>{meta.title}</h2></div>
      <a className="btn" href="/">العودة إلى المقرر</a>
    </header>
    <PreviewPlayer jobId={jobId} />
  </main>;
}
