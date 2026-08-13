import { describe, expect, it } from "vitest";
import { H5P_RUNTIME_DIRECTORY, indexHtml, manifestXml, PACKAGE_README, PLAYER_CSS, PLAYER_JS, PLAYER_RESPONSIVE_CSS, SCORM_12_JS, SCORM_BUILD, type ScormCourse } from "../src/lib/scorm/templates";

const course: ScormCourse = {
  title: "مقرر <تجريبي>",
  passingScore: 70,
  navigation: "free",
  completionRule: "all_completed",
  theme: { background: "#25113f", accent: "#ffb020" },
  contents: [{ id: "job_1234567890abcdef", title: "فيديو 1", path: "h5p/content-001" }]
};

describe("SCORM 1.2 package templates", () => {
  it("creates a valid one-SCO manifest and escapes XML values", () => {
    const manifest = manifestXml(course.title, ["index.html", "h5p/content-001/h5p.json"]);
    expect(manifest).toContain("<schemaversion>1.2</schemaversion>");
    expect(manifest).toContain('adlcp:scormtype="sco"');
    expect(manifest).toContain("مقرر &lt;تجريبي&gt;");
    expect(manifest).toContain('href="h5p/content-001/h5p.json"');
  });

  it("keeps the generated player self-contained", () => {
    const html = indexHtml(course);
    expect(html).toContain('src="player/player.js"');
    expect(html).toContain('src="scorm/scorm12.js"');
    expect(html).not.toMatch(/https?:\/\//);
    expect(PLAYER_JS).toContain("H5PStandalone.H5P");
    expect(PLAYER_JS).toContain(`packageUrl("assets/${H5P_RUNTIME_DIRECTORY}/main.bundle.js")`);
    expect(PLAYER_JS).toContain('dispatcher.on("xAPI"');
    expect(PLAYER_JS).toContain('video.on("stateChange"');
    expect(PLAYER_JS).toContain("event.data === endedState");
    expect(PLAYER_JS).toContain("markVideoCompleted(index)");
    expect(PLAYER_JS).not.toContain('if (["completed", "passed", "failed"].indexOf(verb) >= 0) state.d[index] = 1');
    expect(PLAYER_JS).toContain('"إنجاز المقرر: " + progress + "% — مكتمل " + completed + " من " + count');
    expect(PLAYER_CSS).toContain(".content-area{direction:ltr;flex:1;min-width:0;padding:0;background:#000");
    expect(PLAYER_CSS).toContain(".content-area #h5p-container{width:100%;max-width:none;margin:0}");
    expect(PLAYER_RESPONSIVE_CSS).toContain("width:min(100%,calc(177.78vh - 320px))");
    expect(PLAYER_JS).toContain('window.location.protocol === "file:"');
    expect(PLAYER_JS).toContain("ensureH5PRuntime");
    expect(PLAYER_JS).toContain("var H5PConstructor = null");
    expect(PLAYER_JS).toContain("new RuntimeH5P(container");
    expect(PLAYER_JS).toContain("runtimePromise = null");
    expect(PLAYER_JS).toContain("if (contentLoading)");
    expect(PLAYER_JS).toContain('index === activeContentIndex');
    expect(PLAYER_JS).toContain("waitForH5PInstance(40)");
    expect(PLAYER_JS).toContain("H5PStandalone: ");
    expect(html).toContain(`Build ${SCORM_BUILD}`);
    expect(html).toContain("--bg:#25113f");
    expect(html).toContain("--accent:#ffb020");
    expect(PLAYER_JS).toContain("requestPlayerResize()");
    expect(PLAYER_JS).toContain('instance.trigger("resize")');
    expect(SCORM_12_JS).toContain('LMSInitialize("")');
    expect(SCORM_12_JS).toContain('LMSSetValue(key, String(value))');
    expect(PACKAGE_README).toContain("لا تفك ضغط ملف ZIP");
  });

  it("falls back to safe theme colors when invalid values are supplied", () => {
    const html = indexHtml({ ...course, theme: { background: "red;display:none", accent: "javascript:alert(1)" } });
    expect(html).toContain("--bg:#07111f");
    expect(html).toContain("--accent:#65e1b8");
    expect(html).not.toContain("display:none");
    expect(html).not.toContain("javascript:");
  });
});
