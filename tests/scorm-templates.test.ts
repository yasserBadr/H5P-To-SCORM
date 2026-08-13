import { describe, expect, it } from "vitest";
import { H5P_RUNTIME_DIRECTORY, indexHtml, manifestXml, PACKAGE_README, PLAYER_JS, SCORM_12_JS, SCORM_BUILD, type ScormCourse } from "../src/lib/scorm/templates";

const course: ScormCourse = {
  title: "مقرر <تجريبي>",
  passingScore: 70,
  navigation: "free",
  completionRule: "all_completed",
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
    expect(SCORM_12_JS).toContain('LMSInitialize("")');
    expect(SCORM_12_JS).toContain('LMSSetValue(key, String(value))');
    expect(PACKAGE_README).toContain("لا تفك ضغط ملف ZIP");
  });
});
