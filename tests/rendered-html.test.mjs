import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("server-renders the StudyBloom application shell", async () => {
  const [layout, app, tools] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/StudyBloomV2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/Tools.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /StudyBloom — Your personal study space/i);
  assert.match(app, /School hub/);
  assert.match(app, /Customize profile/);
  assert.match(layout, /studybloom-icon\.png/);
  assert.match(tools, /Whiteboard/);
  assert.match(tools, /Calculator/);
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

test("starts XP at zero and warns before manual changes", async () => {
  const [defaults, app, panel] = await Promise.all([
    readFile(new URL("../app/study/defaults.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/study/StudyBloomV2.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/study/ExperiencePanels.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(defaults, /xp: 0/);
  assert.match(app, /parsed\.profile\?\.xpVersion !== 2/);
  assert.match(app, /firstCompletion/);
  assert.match(panel, /window\.confirm/);
  assert.match(panel, /Reset to 0/);
  assert.match(panel, /complete schoolwork, tasks, practice, and study sessions/);
});

test("ships private Vercel and Supabase cross-device synchronization", async () => {
  const [syncRoute, syncClient, schema, setup] = await Promise.all([
    readFile(new URL("../app/api/sync/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/study/CloudSync.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
    readFile(new URL("../VERCEL-SETUP.md", import.meta.url), "utf8"),
  ]);
  assert.match(syncRoute, /authenticateStudyBloom/);
  assert.match(syncRoute, /status: 409/);
  assert.match(syncRoute, /study_snapshots/);
  assert.match(syncClient, /mergeState/);
  assert.match(syncClient, /Offline changes are queued/);
  assert.match(syncClient, /Sign in to sync/);
  assert.match(schema, /idx_study_snapshots_user_created/);
  assert.match(setup, /STUDYBLOOM_OWNER_EMAIL/);
});
