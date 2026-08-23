import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the StudyBloom application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>StudyBloom — Your personal study space<\/title>/i);
  assert.match(html, /School hub/);
  assert.match(html, /Customize profile/);
  assert.match(html, /studybloom-icon\.png/);
  assert.match(html, /Whiteboard/);
  assert.match(html, /Calculator/);
});

test("ships personalization and installable-app metadata", async () => {
  const [layout, manifest, source] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../app/study/Views.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /studybloom-icon\.png/);
  assert.match(manifest, /"name": "StudyBloom"/);
  assert.match(manifest, /studybloom-icon\.png/);
  assert.match(source, /Choose an avatar/);
  assert.match(source, /Your school name/);
  assert.match(source, /Daily study goal/);
  assert.match(source, /Accent color/);
});

test("ships quick management, install guidance, and interactive XP", async () => {
  const [app, panels, experience] = await Promise.all([
    readFile(new URL("../app/study/StudyBloomV2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/ExperiencePanels.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/experience.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /removeClass/);
  assert.match(app, /removeMaterial/);
  assert.match(app, /QuickActions/);
  assert.match(panels, /Install StudyBloom now/);
  assert.match(panels, /Add to Home Screen/);
  assert.match(panels, /How to earn XP/);
  assert.match(experience, /XP_PER_LEVEL/);
});

test("ships editable Canvas-style classrooms with saved progress", async () => {
  const [app, classroom, types] = await Promise.all([
    readFile(new URL("../app/study/StudyBloomV2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/CoursePlatform.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/types.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /CourseDetailView/);
  assert.match(app, /updateCourse/);
  assert.match(app, /localStorage\.setItem\("studybloom-v3"/);
  assert.match(classroom, /Open classroom/);
  assert.match(classroom, /Edit class details/);
  assert.match(classroom, /Progress autosaved/);
  assert.match(classroom, /Modules.*Assignments.*Grades.*Notes/);
  assert.match(types, /meetingTime/);
  assert.match(types, /syllabus/);
});
