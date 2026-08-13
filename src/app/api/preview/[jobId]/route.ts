import { prepareH5PPackage } from "@/lib/h5p/dependency-resolver";
import { jobDir, validJobId } from "@/lib/jobs/storage";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const html = (jobId: string) => `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>H5P Preview</title>
  <style>
    html,body{margin:0;min-height:100%;font-family:Arial,sans-serif;background:#fff}
    #status{padding:28px;text-align:center;color:#64748b;line-height:1.7}
    #status.error{margin:16px;color:#b42318;background:#fee4e2;border:1px solid #fda29b;border-radius:10px}
    #retry{display:none;margin:12px auto;border:0;border-radius:8px;background:#b42318;color:#fff;padding:9px 16px;cursor:pointer}
  </style>
</head>
<body>
  <div id="status">جارٍ تحميل مكتبات H5P والتفاعلات…</div>
  <button id="retry" type="button" onclick="location.reload()">إعادة المحاولة</button>
  <div id="h5p-container" dir="ltr"></div>
  <script src="/api/runtime/main.bundle.js"></script>
  <script>
    (async function () {
      var status = document.getElementById("status");
      var retry = document.getElementById("retry");
      var container = document.getElementById("h5p-container");
      try {
        if (!window.H5PStandalone || typeof window.H5PStandalone.H5P !== "function") {
          throw new Error("لم يكتمل تحميل مشغّل H5P");
        }
        await new window.H5PStandalone.H5P(container, {
          id: "h5p-preview-${jobId}",
          h5pJsonPath: "/api/jobs/${jobId}/content",
          frameJs: "/api/runtime/frame.bundle.js",
          frameCss: "/api/runtime/styles/h5p.css",
          frame: true,
          fullScreen: true,
          reportingIsEnabled: true
        });
        await new Promise(function (resolve, reject) {
          var attempts = 40;
          function inspect() {
            try {
              var frame = container.querySelector("iframe");
              var h5p = frame && frame.contentWindow && frame.contentWindow.H5P;
              if (h5p && Array.isArray(h5p.instances) && h5p.instances.length) return resolve();
            } catch (_) {}
            if (attempts-- <= 0) return reject(new Error("لم تُسجّل مكتبة H5P.InteractiveVideo داخل المشغّل"));
            setTimeout(inspect, 100);
          }
          inspect();
        });
        status.remove();
      } catch (error) {
        status.className = "error";
        status.textContent = "تعذرت المعاينة: " + (error && error.message ? error.message : "خطأ غير معروف");
        retry.style.display = "block";
      }
    })();
  </script>
</body>
</html>`;

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (!validJobId(jobId)) return new Response("Not found", { status: 404 });
  try {
    await prepareH5PPackage(path.join(jobDir(jobId), "content"));
    return new Response(html(jobId), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذرت المعاينة";
    return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body><p>${message.replaceAll("<", "&lt;")}</p></body></html>`, {
      status: 422,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
    });
  }
}
