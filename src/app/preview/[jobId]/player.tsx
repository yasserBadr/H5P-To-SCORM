export default function PreviewPlayer({ jobId }: { jobId: string }) {
  return <iframe
    title="مشغّل H5P"
    src={`/api/preview/${jobId}`}
    style={{ display: "block", width: "100%", minHeight: 640, border: 0, borderRadius: 12, background: "#fff" }}
  />;
}
