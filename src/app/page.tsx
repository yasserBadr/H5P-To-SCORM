"use client";

import { useMemo, useRef, useState } from "react";

type Result = { jobId: string; title: string; filename: string; size: number; mainLibrary: string; version: string };

export default function Home() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [drag, setDrag] = useState(false);
  const [items, setItems] = useState<Result[]>([]);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [courseTitle, setCourseTitle] = useState("مقرر الفيديو التفاعلي");
  const [passingScore, setPassingScore] = useState(70);
  const [navigation, setNavigation] = useState("free");
  const [completionRule, setCompletionRule] = useState("all_completed");

  async function upload(files?: FileList | File[]) {
    const selected = Array.from(files || []).filter((file) => file.name.toLowerCase().endsWith(".h5p"));
    if (!selected.length) { setError("اختر ملفًا واحدًا أو أكثر بامتداد .h5p"); return; }
    setBusy(true);
    setError("");
    const accepted: Result[] = [];
    const errors: string[] = [];
    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      setUploadProgress(`جارٍ رفع وفحص ${index + 1} من ${selected.length}: ${file.name}`);
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/jobs", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر رفع الملف.");
        accepted.push(data);
      } catch (caught) {
        errors.push(`${file.name}: ${caught instanceof Error ? caught.message : "خطأ غير متوقع"}`);
      }
    }
    setItems((current) => [...current, ...accepted]);
    if (errors.length) setError(errors.join("\n"));
    setBusy(false);
    setUploadProgress("");
    if (input.current) input.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    setItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({
      title: courseTitle,
      passingScore: String(passingScore),
      navigation,
      completionRule
    });
    items.forEach((item) => params.append("job", item.jobId));
    return `/api/scorm?${params.toString()}`;
  }, [items, courseTitle, passingScore, navigation, completionRule]);

  return <main className="shell">
    <section className="hero">
      <div className="brand"><span>H5P</span><span>→</span><span>SCORM</span></div>
      <h1>حوّل فيديوهات H5P التفاعلية<br />إلى مقرر SCORM 1.2.</h1>
      <p className="lead">ارفع ملفًا واحدًا أو عدة ملفات، عاين التفاعلات الأصلية، ثم نزّل حزمة ZIP مستقلة وجاهزة للرفع إلى نظام إدارة التعلم.</p>
      <label className={`drop ${drag ? "drag" : ""}`} onDragOver={(event) => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(event) => { event.preventDefault(); setDrag(false); void upload(event.dataTransfer.files); }}>
        <input ref={input} type="file" accept=".h5p" multiple onChange={(event) => void upload(event.target.files || undefined)} />
        <span className="upload-icon">↑</span>
        <strong>{busy ? uploadProgress : "اسحب ملفات H5P إلى هنا"}</strong>
        <p className="hint">أو اضغط لاختيار ملف واحد أو عدة ملفات من جهازك</p>
        <small className="meta">يدعم H5P.InteractiveVideo فقط</small>
      </label>
    </section>

    {busy && <div className="card row"><span>{uploadProgress}</span><span className="spinner" /></div>}
    {error && <div className="card error"><strong>تعذر قبول بعض الملفات</strong><p className="pre-line">{error}</p></div>}

    {items.length > 0 && <>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">محتويات المقرر</span><h2>{items.length} {items.length === 1 ? "محتوى" : "محتويات"}</h2></div><button className="small-button" type="button" onClick={() => input.current?.click()}>+ إضافة ملفات</button></div>
        <div className="course-list">
          {items.map((item, index) => <article className="file-row" key={item.jobId}>
            <span className="order-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="file-icon">H5P</span>
            <div className="file-details"><div className="name">{item.filename}</div><div className="meta">{item.title} · {(item.size / 1024 / 1024).toFixed(1)} MB · {item.mainLibrary} {item.version}</div><div className="status">فيديو تفاعلي صالح ✓</div></div>
            <div className="file-actions">
              <button type="button" title="تحريك لأعلى" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button type="button" title="تحريك لأسفل" disabled={index === items.length - 1} onClick={() => move(index, 1)}>↓</button>
              <button type="button" onClick={() => setPreview(item)}>معاينة</button>
              <button className="danger-button" type="button" onClick={() => setItems((current) => current.filter((entry) => entry.jobId !== item.jobId))}>حذف</button>
            </div>
          </article>)}
        </div>
      </section>

      <section className="section-card settings">
        <div className="section-heading"><div><span className="eyebrow">إعدادات التصدير</span><h2>SCORM 1.2</h2></div><span className="ready-badge">جاهز للتصدير</span></div>
        <div className="settings-grid">
          <label className="field field-wide"><span>عنوان المقرر</span><input value={courseTitle} maxLength={200} onChange={(event) => setCourseTitle(event.target.value)} /></label>
          <label className="field"><span>درجة الاجتياز</span><div className="number-field"><input type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(Math.max(0, Math.min(100, Number(event.target.value))))} /><b>%</b></div></label>
          <label className="field"><span>التنقل</span><select value={navigation} onChange={(event) => setNavigation(event.target.value)}><option value="free">تنقل حر</option><option value="sequential">تسلسلي</option></select></label>
          <label className="field field-wide"><span>قاعدة الإكمال</span><select value={completionRule} onChange={(event) => setCompletionRule(event.target.value)}><option value="all_completed">إكمال جميع المحتويات</option><option value="all_visited">زيارة جميع المحتويات</option><option value="passing_score">تحقيق درجة الاجتياز</option><option value="all_required">إكمال جميع التفاعلات المطلوبة</option></select></label>
        </div>
        <div style={{marginTop:22,padding:"13px 15px",border:"1px solid #5c4d2b",borderRadius:10,background:"#2a2415",color:"#f5d88a",lineHeight:1.7}}><strong>طريقة التشغيل:</strong> ارفع ملف ZIP الناتج نفسه إلى نظام LMS. لا تفك الضغط ولا تفتح <b style={{direction:"ltr",display:"inline-block"}}>index.html</b> مباشرة؛ للمعاينة استخدم زر «معاينة» أعلاه.</div>
        <div className="export-bar"><div><strong>حزمة مستقلة دون اتصال بالإنترنت</strong><p className="hint">تتضمن مشغل H5P والمكتبات والمحتوى وملف imsmanifest.xml.</p></div><a className="btn export-button" href={exportUrl}>تصدير SCORM 1.2 ZIP ↓</a></div>
      </section>
    </>}

    {preview && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`معاينة ${preview.title}`} onMouseDown={(event) => { if (event.currentTarget === event.target) setPreview(null); }}>
      <div className="preview-modal"><header><div><span className="eyebrow">معاينة H5P</span><h2>{preview.title}</h2></div><button type="button" aria-label="إغلاق المعاينة" onClick={() => setPreview(null)}>×</button></header><iframe title={`معاينة ${preview.title}`} src={`/preview/${preview.jobId}`} /></div>
    </div>}
  </main>;
}
