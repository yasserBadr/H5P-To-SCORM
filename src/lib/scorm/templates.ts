export type ScormCourse = {
  title: string;
  passingScore: number;
  navigation: "free" | "sequential";
  completionRule: "all_completed" | "all_visited" | "passing_score" | "all_required";
  contents: Array<{ id: string; title: string; path: string }>;
};

export const SCORM_BUILD = "2026.08.13-cloud.7";
export const H5P_RUNTIME_DIRECTORY = "h5p-runtime-3.8.2";

const xml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export function manifestXml(title: string, files: string[]) {
  const fileEntries = files.map((file) => `      <file href="${xml(file)}"/>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="H5P_SCORM_COURSE" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${xml(title)}</title>
      <item identifier="ITEM-1" identifierref="RESOURCE-1"><title>${xml(title)}</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RESOURCE-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${fileEntries}
    </resource>
  </resources>
</manifest>`;
}

export function indexHtml(course: ScormCourse) {
  const data = JSON.stringify(course).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${xml(course.title)}</title>
  <link rel="stylesheet" href="player/player.css">
</head>
<body>
  <div class="course-shell">
    <header class="topbar">
      <button id="menu-toggle" class="icon-button" type="button" aria-label="إظهار أو إخفاء قائمة المحتويات">☰</button>
      <div class="course-heading"><strong id="course-title"></strong><span id="current-title"></span></div>
      <div class="score"><span id="score-value">0%</span><small>النتيجة</small></div>
      <div class="progress"><span id="progress-label">0%</span><div><i id="progress-bar"></i></div></div>
    </header>
    <div class="workspace">
      <aside id="sidebar"><h2>محتويات المقرر</h2><nav id="course-menu"></nav></aside>
      <main class="content-area">
        <div id="status-message" role="status"></div>
        <div id="h5p-container"></div>
      </main>
    </div>
    <footer>
      <button id="previous" type="button">السابق</button>
      <span id="position"></span>
      <small id="build-id" class="build-id">Build ${SCORM_BUILD}</small>
      <button id="next" type="button">التالي</button>
    </footer>
  </div>
  <script>window.SCORM_BUILD=${JSON.stringify(SCORM_BUILD)};window.COURSE_DATA=${data};</script>
  <script src="scorm/scorm12.js"></script>
  <script src="player/player.js"></script>
</body>
</html>`;
}

export const PACKAGE_README = `H5P Interactive Video — SCORM 1.2

طريقة التشغيل الصحيحة:
1. لا تفك ضغط ملف ZIP ولا تفتح index.html بالنقر المزدوج.
2. ارفع ملف ZIP نفسه كنشاط SCORM 1.2 إلى Moodle أو SCORM Cloud أو أي LMS يدعم SCORM 1.2.
3. للمعاينة قبل الرفع استخدم زر "معاينة" داخل تطبيق H5P to SCORM.

ملاحظة: الحزمة لا تحتاج إلى الإنترنت أو إلى تطبيق التحويل بعد رفعها، لكنها تحتاج أن يقدمها نظام LMS عبر HTTP/HTTPS. متصفحات الويب تمنع مشغل H5P من قراءة ملفات JSON عند التشغيل المباشر عبر file://.
`;

export const SCORM_12_JS = String.raw`(function () {
  "use strict";
  var api = null;
  var initialized = false;

  function search(start) {
    try {
      var current = start;
      for (var depth = 0; depth < 20 && current; depth += 1) {
        if (current.API) return current.API;
        if (current.parent === current) break;
        current = current.parent;
      }
    } catch (_) {}
    return null;
  }

  function locate() {
    return search(window) || (window.opener ? search(window.opener) : null);
  }

  window.CourseSCORM = {
    initialize: function () {
      if (initialized) return true;
      api = locate();
      if (!api) return false;
      initialized = api.LMSInitialize("") === "true";
      return initialized;
    },
    get: function (key) {
      if (!initialized || !api) return "";
      try { return api.LMSGetValue(key) || ""; } catch (_) { return ""; }
    },
    set: function (key, value) {
      if (!initialized || !api) return false;
      try { return api.LMSSetValue(key, String(value)) === "true"; } catch (_) { return false; }
    },
    commit: function () {
      if (!initialized || !api) return false;
      try { return api.LMSCommit("") === "true"; } catch (_) { return false; }
    },
    finish: function () {
      if (!initialized || !api) return false;
      try {
        this.commit();
        var result = api.LMSFinish("") === "true";
        initialized = false;
        return result;
      } catch (_) { return false; }
    },
    available: function () { return Boolean(api && initialized); }
  };

  window.addEventListener("pagehide", function () { window.CourseSCORM.finish(); });
})();`;

export const PLAYER_JS = String.raw`(function () {
  "use strict";
  if (window.location.protocol === "file:") {
    document.body.innerHTML = '<main class="launch-warning" dir="rtl"><h1>لا تفتح index.html مباشرة</h1><p>متصفح الويب يمنع مشغل H5P من قراءة ملفات الحزمة عند التشغيل عبر <b>file://</b>.</p><p>ارفع ملف ZIP نفسه إلى Moodle أو SCORM Cloud كنشاط SCORM 1.2. للمعاينة المحلية استخدم زر «معاينة» داخل تطبيق التحويل.</p><p>الحزمة مستقلة ولا تحتاج إلى الإنترنت بعد رفعها إلى نظام إدارة التعلم.</p></main>';
    return;
  }
  var playerScript = document.currentScript;
  var packageRoot = new URL("../", playerScript && playerScript.src ? playerScript.src : window.location.href).href;
  var runtimePromise = null;
  var H5PConstructor = null;
  var contentLoading = false;
  var activeContentIndex = -1;
  var course = window.COURSE_DATA;
  var build = window.SCORM_BUILD || "unknown";
  var scorm = window.CourseSCORM;
  var count = course.contents.length;
  var state = { c: 0, v: Array(count).fill(0), d: Array(count).fill(0), s: Array(count).fill(null) };
  var connectedDispatchers = [];

  var menu = document.getElementById("course-menu");
  var container = document.getElementById("h5p-container");
  var message = document.getElementById("status-message");
  var previous = document.getElementById("previous");
  var next = document.getElementById("next");

  function packageUrl(relativePath) {
    return new URL(relativePath, packageRoot).href;
  }

  function ensureH5PRuntime() {
    if (H5PConstructor) return Promise.resolve(H5PConstructor);
    if (window.H5PStandalone && typeof window.H5PStandalone.H5P === "function") {
      H5PConstructor = window.H5PStandalone.H5P;
      return Promise.resolve(H5PConstructor);
    }
    if (runtimePromise) return runtimePromise;
    runtimePromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = packageUrl("assets/${H5P_RUNTIME_DIRECTORY}/main.bundle.js");
      script.onload = function () {
        if (window.H5PStandalone && typeof window.H5PStandalone.H5P === "function") {
          H5PConstructor = window.H5PStandalone.H5P;
          resolve(H5PConstructor);
        }
        else reject(new Error("تم تحميل ملف H5P runtime لكنه لم يعرّف H5PStandalone"));
      };
      script.onerror = function () { reject(new Error("تعذر تحميل H5P runtime من: " + script.src)); };
      document.head.appendChild(script);
    }).catch(function (error) {
      runtimePromise = null;
      throw error;
    });
    return runtimePromise;
  }

  function restore() {
    scorm.initialize();
    try {
      var saved = JSON.parse(scorm.get("cmi.suspend_data") || "null");
      if (saved && Array.isArray(saved.v) && saved.v.length === count) {
        state.c = Math.max(0, Math.min(count - 1, Number(saved.c) || 0));
        state.v = saved.v.map(function (v) { return v ? 1 : 0; });
        state.d = (saved.d || []).map(function (v) { return v ? 1 : 0; });
        state.s = (saved.s || []).map(function (v) { return typeof v === "number" ? v : null; });
        while (state.d.length < count) state.d.push(0);
        while (state.s.length < count) state.s.push(null);
      } else {
        var location = Number(scorm.get("cmi.core.lesson_location"));
        if (Number.isInteger(location) && location >= 0 && location < count) state.c = location;
      }
    } catch (_) {}
  }

  function courseScore() {
    var scored = state.s.filter(function (value) { return typeof value === "number"; });
    if (!scored.length) return 0;
    return Math.round(scored.reduce(function (sum, value) { return sum + value; }, 0) / scored.length);
  }

  function isComplete(score) {
    if (course.completionRule === "all_visited") return state.v.every(Boolean);
    if (course.completionRule === "passing_score") return score >= course.passingScore;
    return state.d.every(Boolean);
  }

  function persist() {
    var score = courseScore();
    var complete = isComplete(score);
    scorm.set("cmi.core.lesson_location", state.c);
    scorm.set("cmi.suspend_data", JSON.stringify(state));
    scorm.set("cmi.core.score.min", 0);
    scorm.set("cmi.core.score.max", 100);
    scorm.set("cmi.core.score.raw", score);
    scorm.set("cmi.core.lesson_status", complete ? (score >= course.passingScore ? "passed" : "failed") : "incomplete");
    scorm.commit();
    renderStatus();
  }

  function canOpen(index) {
    if (course.navigation === "free" || index <= state.c) return true;
    for (var i = 0; i < index; i += 1) if (!state.v[i]) return false;
    return true;
  }

  function renderMenu() {
    menu.textContent = "";
    course.contents.forEach(function (content, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "course-item" + (index === state.c ? " active" : "") + (state.d[index] ? " done" : "");
      button.disabled = contentLoading || !canOpen(index);
      var number = document.createElement("span");
      number.className = "item-number";
      number.textContent = state.d[index] ? "✓" : String(index + 1).padStart(2, "0");
      var label = document.createElement("span");
      label.textContent = content.title;
      button.append(number, label);
      button.addEventListener("click", function () { loadContent(index); });
      menu.appendChild(button);
    });
  }

  function renderStatus() {
    var completed = state.d.filter(Boolean).length;
    var visited = state.v.filter(Boolean).length;
    var progress = Math.round((course.completionRule === "all_visited" ? visited : completed) / count * 100);
    document.getElementById("progress-label").textContent = progress + "%";
    document.getElementById("progress-bar").style.width = progress + "%";
    document.getElementById("score-value").textContent = courseScore() + "%";
    document.getElementById("position").textContent = (state.c + 1) + " / " + count;
    document.getElementById("current-title").textContent = course.contents[state.c].title;
    previous.disabled = contentLoading || state.c === 0;
    next.disabled = contentLoading || state.c === count - 1 || !canOpen(state.c + 1);
    renderMenu();
  }

  function scoreFromResult(result) {
    if (!result || !result.score) return null;
    if (typeof result.score.scaled === "number") return Math.round(result.score.scaled * 100);
    if (typeof result.score.raw === "number" && typeof result.score.max === "number" && result.score.max > 0) {
      return Math.round(result.score.raw / result.score.max * 100);
    }
    return null;
  }

  function handleXAPI(event, index) {
    var statement = event && event.data && event.data.statement ? event.data.statement : event && event.statement;
    if (!statement) return;
    var verb = (statement.verb && (statement.verb.id || statement.verb.display && statement.verb.display["en-US"])) || "";
    verb = String(verb).toLowerCase().split("/").pop();
    var score = scoreFromResult(statement.result);
    if (score !== null) state.s[index] = Math.max(0, Math.min(100, score));
    if (["completed", "passed", "failed"].indexOf(verb) >= 0) state.d[index] = 1;
    persist();
  }

  function connectDispatcher(dispatcher, index) {
    if (!dispatcher || typeof dispatcher.on !== "function" || connectedDispatchers.indexOf(dispatcher) >= 0) return;
    connectedDispatchers.push(dispatcher);
    dispatcher.on("xAPI", function (event) { handleXAPI(event, index); });
  }

  function watchForXAPI(index, attempts) {
    try { if (window.H5P) connectDispatcher(window.H5P.externalDispatcher, index); } catch (_) {}
    Array.prototype.forEach.call(container.querySelectorAll("iframe"), function (frame) {
      try { connectDispatcher(frame.contentWindow.H5P.externalDispatcher, index); } catch (_) {}
    });
    if (attempts > 0) setTimeout(function () { watchForXAPI(index, attempts - 1); }, 500);
  }

  function waitForH5PInstance(attempts) {
    return new Promise(function (resolve, reject) {
      function inspect() {
        try {
          var frame = container.querySelector("iframe");
          var frameH5P = frame && frame.contentWindow && frame.contentWindow.H5P;
          if (frameH5P && Array.isArray(frameH5P.instances) && frameH5P.instances.length > 0) {
            resolve();
            return;
          }
        } catch (_) {}
        if (attempts <= 0) {
          reject(new Error("لم تُسجّل مكتبة H5P.InteractiveVideo داخل المشغّل"));
          return;
        }
        attempts -= 1;
        setTimeout(inspect, 100);
      }
      inspect();
    });
  }

  function showPlayerError(error, index) {
    var reason = error && error.message ? error.message : "خطأ غير معروف";
    message.textContent = "";
    message.className = "error-message";

    var title = document.createElement("strong");
    title.textContent = reason === "Failed to fetch"
      ? "تعذر تحميل ملفات H5P من نظام إدارة التعلم."
      : "تعذر تشغيل المحتوى: " + reason;

    var help = document.createElement("p");
    help.textContent = "أعد المحاولة مرة واحدة. إذا استمر الخطأ، انسخ معلومات التشخيص الظاهرة هنا وأرسلها للمطور.";

    var diagnostic = document.createElement("pre");
    diagnostic.className = "diagnostic";
    diagnostic.dir = "ltr";
    diagnostic.textContent = [
      "Build: " + build,
      "Content: " + String(index + 1) + "/" + String(count),
      "Protocol: " + window.location.protocol,
      "H5PStandalone: " + Boolean(window.H5PStandalone && window.H5PStandalone.H5P),
      "H5P global: " + Boolean(window.H5P),
      "Runtime: assets/${H5P_RUNTIME_DIRECTORY}/main.bundle.js"
    ].join("\n");

    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-button";
    retry.textContent = "إعادة المحاولة";
    retry.addEventListener("click", function () { loadContent(index); });
    message.append(title, help, diagnostic, retry);
  }

  async function loadContent(index) {
    if (index === activeContentIndex && container.querySelector("iframe")) return;
    if (contentLoading) {
      message.textContent = "جارٍ تحميل المحتوى بالفعل… انتظر حتى يكتمل (Build " + build + ").";
      message.className = "loading-message";
      return;
    }
    if (!canOpen(index)) return;
    contentLoading = true;
    state.c = index;
    state.v[index] = 1;
    message.textContent = "جارٍ تحميل المحتوى… (Build " + build + ")";
    message.className = "loading-message";
    container.textContent = "";
    persist();
    try {
      var RuntimeH5P = await ensureH5PRuntime();
      if (typeof RuntimeH5P !== "function") {
        throw new Error("H5P runtime لم يكتمل تحميله");
      }
      await new RuntimeH5P(container, {
        id: "h5p-content-" + String(index + 1),
        h5pJsonPath: packageUrl(course.contents[index].path.replace(/\/?$/, "/")),
        frameJs: packageUrl("assets/${H5P_RUNTIME_DIRECTORY}/frame.bundle.js"),
        frameCss: packageUrl("assets/${H5P_RUNTIME_DIRECTORY}/styles/h5p.css"),
        frame: true,
        fullScreen: true,
        reportingIsEnabled: true
      });
      await waitForH5PInstance(40);
      activeContentIndex = index;
      message.textContent = "";
      message.className = "";
      watchForXAPI(index, 20);
    } catch (error) {
      showPlayerError(error, index);
    } finally {
      contentLoading = false;
      renderStatus();
    }
  }

  document.getElementById("course-title").textContent = course.title;
  document.getElementById("menu-toggle").addEventListener("click", function () {
    document.body.classList.toggle("sidebar-collapsed");
  });
  previous.addEventListener("click", function () { if (state.c > 0) loadContent(state.c - 1); });
  next.addEventListener("click", function () { if (state.c < count - 1) loadContent(state.c + 1); });
  restore();
  renderStatus();
  loadContent(state.c);
})();`;

export const PLAYER_CSS = String.raw`:root{--bg:#07111f;--panel:#0d1b2d;--line:#23364e;--text:#f5f8fc;--muted:#9aabc1;--accent:#65e1b8}*{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:Arial,sans-serif;background:var(--bg);color:var(--text)}button{font:inherit}.course-shell{min-height:100vh;display:flex;flex-direction:column}.topbar{height:76px;display:flex;align-items:center;gap:18px;padding:12px 20px;background:#0b1727;border-bottom:1px solid var(--line)}.icon-button{border:1px solid var(--line);background:#14243a;color:var(--text);border-radius:9px;padding:8px 11px;cursor:pointer}.course-heading{display:flex;flex-direction:column;min-width:0;flex:1}.course-heading span{font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.score{text-align:center}.score span{display:block;font-weight:800;color:var(--accent)}.score small{color:var(--muted)}.progress{width:min(240px,25vw);font-size:12px;color:var(--muted)}.progress>div{height:7px;background:#203149;border-radius:99px;margin-top:5px;overflow:hidden}.progress i{display:block;height:100%;width:0;background:var(--accent);transition:.25s}.workspace{display:flex;direction:rtl;flex:1;min-height:0}aside{width:280px;background:var(--panel);border-left:1px solid var(--line);padding:20px 14px;transition:.2s}aside h2{font-size:14px;color:var(--muted);margin:0 8px 16px}.course-item{width:100%;display:flex;align-items:center;gap:10px;text-align:right;border:0;background:transparent;color:var(--text);padding:12px;border-radius:10px;cursor:pointer;margin:3px 0}.course-item:hover,.course-item.active{background:#172a43}.course-item:disabled{opacity:.42;cursor:not-allowed}.item-number{direction:ltr;display:grid;place-items:center;min-width:32px;height:32px;border-radius:9px;background:#223650;color:var(--muted);font-size:12px}.course-item.done .item-number{background:#123d38;color:var(--accent)}.content-area{direction:ltr;flex:1;min-width:0;padding:20px;background:#f5f7fa;color:#111}.content-area #h5p-container{max-width:1200px;margin:auto}#status-message{text-align:center;color:#64748b;padding:8px}.loading-message{color:#475569!important}.error-message{color:#b42318!important;background:#fee4e2;border:1px solid #fda29b;border-radius:8px;padding:14px!important;direction:rtl}.error-message p{margin:8px 0}.diagnostic{direction:ltr;text-align:left;white-space:pre-wrap;background:#fff;border:1px solid #fda29b;border-radius:6px;padding:10px;color:#7a271a}.retry-button{border:0;border-radius:7px;background:#b42318;color:#fff;padding:8px 15px;cursor:pointer}.build-id{direction:ltr;color:#6f829b;font-size:10px}footer{height:68px;display:flex;justify-content:center;align-items:center;gap:18px;border-top:1px solid var(--line);background:#0b1727}footer button{border:1px solid var(--line);background:#182b43;color:var(--text);border-radius:9px;padding:9px 20px;cursor:pointer}footer button:disabled{opacity:.4;cursor:not-allowed}.sidebar-collapsed aside{display:none}@media(max-width:760px){.topbar{gap:10px;padding:10px}.progress{display:none}.score{font-size:13px}aside{position:fixed;z-index:20;top:76px;right:0;bottom:68px;width:min(85vw,320px);box-shadow:-12px 0 30px #0008}.sidebar-collapsed aside{display:none}.content-area{padding:8px}.course-heading strong{font-size:14px}}`;
