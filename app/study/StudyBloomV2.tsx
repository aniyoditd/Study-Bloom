"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { DEFAULT_STATE } from "./defaults";
import { buildLocalStudyKit } from "./generator";
import { extractStudyFile } from "./files";
import { classById, dueCards, reviewProgress } from "./progress";
import type { Activity, CalendarEvent, CardProgress, ClassRoom, ExamAttempt, Material, Question, QuestionType, StudyKitPayload, StudyNote, StudyState, StudyTask, View } from "./types";
import { AppModal, CalendarView, ClassesView, Dashboard, LibraryView, MathLab, NotesView, PlannerView, ProgressView, SettingsView, StudyView } from "./Views";
import { SchoolHub, type ExamPlanInput } from "./SchoolHub";
import { ToolDock } from "./Tools";
import { FocusStudio } from "./FocusStudio";

const NAV: Array<{ view: View; icon: string }> = [
  { view: "Home", icon: "⌂" }, { view: "School hub", icon: "◆" }, { view: "Classes", icon: "▦" }, { view: "Library", icon: "▤" },
  { view: "Study", icon: "✦" }, { view: "Planner", icon: "✓" }, { view: "Calendar", icon: "□" },
  { view: "Focus", icon: "◷" }, { view: "Notes", icon: "✎" }, { view: "Math lab", icon: "∑" },
  { view: "Progress", icon: "↗" }, { view: "Settings", icon: "⚙" },
];
const COLORS = ["#7b5ccc", "#d88760", "#4d83be", "#4f9b78", "#c45d86", "#a77a3c"];
const ICONS = ["📚", "🧬", "∑", "🏛️", "💼", "🧠", "💻", "🗣️"];
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const fmtDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

type ModalKind = "class" | "upload" | "task" | "note" | "event" | "profile" | null;
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function migrateState(): StudyState {
  try {
    const saved = localStorage.getItem("studybloom-v3") || localStorage.getItem("studybloom-v2");
    if (saved) {
      const parsed = JSON.parse(saved) as StudyState;
      return { ...DEFAULT_STATE, ...parsed, profile: { ...DEFAULT_STATE.profile, ...parsed.profile }, classes: (parsed.classes || DEFAULT_STATE.classes).map((item) => ({ ...item, subject: item.subject || "Other" })), tasks: (parsed.tasks || DEFAULT_STATE.tasks).map((task) => ({ ...task, category: task.category || "Homework", priority: task.priority || "Normal", status: task.done ? "Submitted" : task.status || "To do", progress: task.done ? 100 : task.progress || 0, timeSpent: task.timeSpent || 0, sessions: task.sessions || 0 })), version: 3 };
    }
    const old = localStorage.getItem("studybloom-v1");
    if (!old) return DEFAULT_STATE;
    const legacy = JSON.parse(old);
    return { ...DEFAULT_STATE, profile: { ...DEFAULT_STATE.profile, name: legacy.name || DEFAULT_STATE.profile.name, xp: legacy.xp || DEFAULT_STATE.profile.xp } };
  } catch { return DEFAULT_STATE; }
}

export default function StudyBloomV2() {
  const [state, setState] = useState<StudyState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("Home");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedMaterialId, setSelectedMaterialId] = useState(DEFAULT_STATE.materials[0]?.id || "");
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState("");
  const [processing, setProcessing] = useState({ active: false, label: "", percent: 0 });
  const [aiStatus, setAiStatus] = useState({ configured: false, model: "gpt-5.4" });
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setState(migrateState()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) localStorage.setItem("studybloom-v3", JSON.stringify(state)); }, [state, loaded]);
  useEffect(() => { fetch("/api/ai").then((response) => response.json()).then(setAiStatus).catch(() => undefined); }, []);
  useEffect(() => { const handler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); }; window.addEventListener("beforeinstallprompt", handler); return () => window.removeEventListener("beforeinstallprompt", handler); }, []);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 3800); return () => window.clearTimeout(timer); }, [toast]);

  const classes = state.classes;
  const activeClass = classFilter === "all" ? null : classById(classes, classFilter);
  const selectedMaterial = state.materials.find((item) => item.id === selectedMaterialId) || state.materials[0];
  const filteredMaterials = state.materials.filter((item) => classFilter === "all" || item.classId === classFilter);
  const filteredTasks = state.tasks.filter((task) => classFilter === "all" || task.classId === classFilter);
  const filteredNotes = state.notes.filter((note) => classFilter === "all" || note.classId === classFilter);

  const addActivity = (classId: string, kind: Activity["kind"], value: number, label: string) => {
    const activity: Activity = { id: uid(), classId, kind, value, label, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, profile: { ...current.profile, xp: current.profile.xp + Math.max(5, Math.round(value / 2)) }, activities: [activity, ...current.activities] }));
  };

  async function handleFile(file: File, classId: string, title: string) {
    if (file.size > 25 * 1024 * 1024) { setToast("That PDF is over the 25 MB limit."); return; }
    setModal(null); setProcessing({ active: true, label: "Opening your PDF", percent: 5 });
    try {
      const extracted = await extractStudyFile(file, state.settings.ocrEnabled, state.settings.aiEnabled && aiStatus.configured, (label, percent) => setProcessing({ active: true, label, percent }));
      if (!extracted.text.trim()) throw new Error("No readable text was found");
      let kit: StudyKitPayload = buildLocalStudyKit(extracted.text, title || titleFromFile(file.name));
      let aiGenerated = false;
      if (state.settings.aiEnabled && aiStatus.configured) {
        setProcessing({ active: true, label: "AI is building a deeper study kit", percent: 70 });
        const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "study", title, className: classById(classes, classId).name, text: extracted.text }) });
        if (response.ok) { kit = await response.json(); aiGenerated = true; } else setToast("AI was unavailable, so StudyBloom used its local generator.");
      }
      const material: Material = { id: uid(), classId, title: title || titleFromFile(file.name), source: file.name, sourceType: extracted.sourceType, createdAt: new Date().toISOString(), pages: extracted.pages, summary: kit.summary, guide: kit.guide, formulas: kit.formulas || [], flashcards: kit.flashcards.map((card) => ({ ...card, id: uid() })), questions: kit.questions.map((question) => ({ ...question, id: uid(), options: question.options?.length ? question.options : undefined })), ocrUsed: extracted.ocrUsed, aiGenerated };
      setState((current) => ({ ...current, materials: [material, ...current.materials] })); setSelectedMaterialId(material.id); setClassFilter(classId); addActivity(classId, "upload", material.pages, `Created study kit: ${material.title}`); setView("Study"); setToast(`${extracted.ocrUsed ? "OCR scanned and s" : "S"}tudy kit created${aiGenerated ? " with AI" : " locally"}.`);
    } catch (error) { setToast(error instanceof Error ? error.message : "I couldn’t read that PDF."); }
    finally { setProcessing({ active: false, label: "", percent: 0 }); }
  }

  function saveClass(value: Omit<ClassRoom, "id">) { const created = { ...value, id: uid() }; setState((current) => ({ ...current, classes: [...current.classes, created] })); setClassFilter(created.id); setModal(null); setToast(`${created.name} added.`); }
  function saveTask(value: Omit<StudyTask, "id" | "done" | "source">) { setState((current) => ({ ...current, tasks: [{ ...value, id: uid(), done: false, source: "manual", status: value.status || "To do", category: value.category || "Homework", priority: value.priority || "Normal", progress: value.progress || 0, timeSpent: value.timeSpent || 0, sessions: value.sessions || 0 }, ...current.tasks] })); setModal(null); setToast("Schoolwork added to your hub."); }
  function saveNote(value: Omit<StudyNote, "id" | "updatedAt">) { setState((current) => ({ ...current, notes: [{ ...value, id: uid(), updatedAt: new Date().toISOString() }, ...current.notes] })); addActivity(value.classId, "note", 5, `Created note: ${value.title}`); setModal(null); setToast("Note created."); }
  function saveEvent(value: Omit<CalendarEvent, "id">) { setState((current) => ({ ...current, events: [{ ...value, id: uid() }, ...current.events] })); setModal(null); setToast(`${value.type} added to your calendar.`); }
  function toggleTask(id: string) { const task = state.tasks.find((item) => item.id === id); setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, done: !item.done, status: !item.done ? "Submitted" : "To do", progress: !item.done ? 100 : Math.min(item.progress || 0, 95) } : item) })); if (task && !task.done) addActivity(task.classId, "task", task.minutes, `Completed: ${task.title}`); }
  function setTaskStatus(id: string, status: NonNullable<StudyTask["status"]>) { setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, status, done: status === "Submitted", progress: status === "Submitted" ? 100 : item.progress || 0 } : item) })); }
  function updateTaskProgress(id: string, progress: number) { setState((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, progress, status: progress >= 100 ? "Submitted" : progress > 0 ? "In progress" : "To do", done: progress >= 100 } : item) })); }
  function completeStudySession(classId: string, minutes: number, label: string, taskId?: string) { addActivity(classId, "focus", minutes, label); if (taskId) setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, timeSpent: (task.timeSpent || 0) + minutes, sessions: (task.sessions || 0) + 1, progress: Math.min(95, Math.max(task.progress || 0, Math.round(((task.timeSpent || 0) + minutes) / Math.max(task.minutes, 1) * 100))), status: "In progress" } : task) })); }
  function rateCard(material: Material, cardId: string, rating: CardProgress["lastRating"]) { const updated = reviewProgress(state.cardProgress[cardId], cardId, material.id, material.classId, rating); setState((current) => ({ ...current, cardProgress: { ...current.cardProgress, [cardId]: updated } })); addActivity(material.classId, "flashcard", 1, `Reviewed a ${material.title} card`); }
  function recordAttempt(attempt: ExamAttempt) { setState((current) => ({ ...current, attempts: [attempt, ...current.attempts] })); addActivity(attempt.classId, "exam", attempt.percentage, `Scored ${attempt.percentage}% on ${state.materials.find((item) => item.id === attempt.materialId)?.title || "mock exam"}`); }
  function updateNote(id: string, change: Partial<StudyNote>) { setState((current) => ({ ...current, notes: current.notes.map((note) => note.id === id ? { ...note, ...change, updatedAt: new Date().toISOString() } : note) })); }
  function autoPlan(event: CalendarEvent) { const exam = new Date(`${event.date}T12:00:00`); const material = state.materials.find((item) => item.classId === event.classId); const steps = [7, 5, 3, 1].map((days, index) => { const date = new Date(exam); date.setDate(date.getDate() - days); return { id: uid(), classId: event.classId, title: ["Review study guide", "Practice weak topics", "Complete flashcard review", "Take final mock exam"][index] + (material ? `: ${material.title}` : ""), dueDate: date.toISOString().slice(0, 10), minutes: [35, 40, 25, 50][index], done: false, source: "auto-plan" as const }; }).filter((task) => task.dueDate >= today()); setState((current) => ({ ...current, tasks: [...steps, ...current.tasks] })); setToast(`${steps.length}-step study plan created.`); }
  function createExamPlan(input: ExamPlanInput) {
    const exam = new Date(`${input.examDate}T12:00:00`);
    const cursor = new Date(); cursor.setHours(12, 0, 0, 0);
    const preferredDays = [1, 2, 3, 4, 5, 6, 0].slice(0, input.daysPerWeek);
    const dates: string[] = [];
    while (cursor < exam) { if (preferredDays.includes(cursor.getDay())) dates.push(cursor.toISOString().slice(0, 10)); cursor.setDate(cursor.getDate() + 1); }
    const available = dates.length ? dates : [today()];
    const topics = input.topics.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
    const materialNames = state.materials.filter((item) => input.materialIds.includes(item.id)).map((item) => item.title);
    const planTasks: StudyTask[] = available.map((date, index) => {
      const phase = index / Math.max(1, available.length - 1);
      const topic = topics[index % Math.max(1, topics.length)] || materialNames[index % Math.max(1, materialNames.length)] || input.title;
      const action = phase < .3 ? "Learn & outline" : phase < .62 ? "Practice & correct" : phase < .84 ? "Flashcard recall" : phase < .95 ? "Timed mixed practice" : "Mock exam & error review";
      return { id: uid(), classId: input.classId, title: `${action}: ${topic}`, dueDate: date, minutes: input.minutes, done: false, source: "auto-plan", category: "Quiz prep", priority: phase > .8 ? "High" : "Normal", status: "To do", progress: 0, timeSpent: 0, sessions: 0, details: [input.notes, materialNames.length ? `Use: ${materialNames.join(", ")}` : ""].filter(Boolean).join(" · ") };
    });
    const event: CalendarEvent = { id: uid(), classId: input.classId, title: input.title, date: input.examDate, type: "Exam" };
    setState((current) => ({ ...current, tasks: [...planTasks, ...current.tasks], events: [event, ...current.events] }));
    setView("Planner"); setToast(`${planTasks.length}-session daily exam plan created.`);
  }
  function exportBackup() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `studybloom-backup-${today()}.json`; link.click(); URL.revokeObjectURL(url); setToast("Backup downloaded."); }
  async function importBackup(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()); if (![2, 3].includes(parsed.version) || !Array.isArray(parsed.classes)) throw new Error(); setState({ ...DEFAULT_STATE, ...parsed, version: 3 }); setToast("Backup restored."); } catch { setToast("That file is not a valid StudyBloom backup."); } event.target.value = ""; }

  return <main className="sb2-shell" style={{ "--sb-purple": state.profile.accent } as React.CSSProperties}>
    <aside className="sb2-sidebar"><button className="sb2-logo" onClick={() => setView("Home")}><span><img src="/studybloom-icon.png" alt=""/></span><b>StudyBloom</b></button><div className="sb2-class-filter"><small>STUDYING</small><button><span style={{ background: activeClass?.color || state.profile.accent }}>{activeClass?.icon || "✦"}</span><b>{activeClass?.name || "All classes"}</b><i>⌄</i></button><select aria-label="Filter by class" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">All classes</option>{classes.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><nav aria-label="Main navigation">{NAV.map((item) => <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => setView(item.view)}><span>{item.icon}</span>{item.view}{item.view === "Study" && dueCards(state, classFilter === "all" ? undefined : classFilter).length > 0 && <i>{dueCards(state, classFilter === "all" ? undefined : classFilter).length}</i>}</button>)}</nav><div className="sb2-streak"><span>🔥</span><div><b>{state.profile.streak} day streak</b><small>{state.profile.motto}</small></div></div><button className="sb2-profile" onClick={() => setModal("profile")}><span>{state.profile.avatar || initials(state.profile.name)}</span><div><b>{state.profile.name}</b><small>{state.profile.gradeLevel} · {state.profile.xp.toLocaleString()} XP</small></div><i>•••</i></button></aside>
    <section className="sb2-main"><header className="sb2-topbar"><button className="sb2-mobile-logo" onClick={() => setView("Home")}><img src="/studybloom-icon.png" alt=""/> StudyBloom</button><div className="sb2-search">⌕ <input placeholder="Search your study space..." aria-label="Search"/><kbd>⌘ K</kbd></div><div className="sb2-top-actions"><button title="Add class" onClick={() => setModal("class")}>＋</button><button title="Customize profile" onClick={() => setModal("profile")}>{state.profile.avatar}</button><span>✦ {state.profile.xp.toLocaleString()} XP</span></div></header><div className="sb2-content">
      {view === "Home" && <Dashboard state={state} classFilter={classFilter} setFilter={setClassFilter} openView={setView} upload={() => setModal("upload")} addTask={() => setModal("task")} openMaterial={(id) => { setSelectedMaterialId(id); setView("Study"); }}/>} 
      {view === "School hub" && <SchoolHub state={state} addAssignment={() => setModal("task")} toggle={toggleTask} setStatus={setTaskStatus} updateProgress={updateTaskProgress} openView={setView} createPlan={createExamPlan}/>} 
      {view === "Classes" && <ClassesView state={state} setFilter={setClassFilter} openView={setView} add={() => setModal("class")}/>} 
      {view === "Library" && <LibraryView state={state} classFilter={classFilter} materials={filteredMaterials} upload={() => setModal("upload")} open={(id) => { setSelectedMaterialId(id); setView("Study"); }} remove={(id) => setState((current) => ({ ...current, materials: current.materials.filter((item) => item.id !== id) }))}/>} 
      {view === "Study" && <StudyView state={state} material={selectedMaterial} materials={filteredMaterials.length ? filteredMaterials : state.materials} select={setSelectedMaterialId} upload={() => setModal("upload")} rateCard={rateCard} recordAttempt={recordAttempt} aiEnabled={state.settings.aiEnabled && aiStatus.configured} addActivity={addActivity}/>} 
      {view === "Planner" && <PlannerView tasks={filteredTasks} classes={classes} toggle={toggleTask} add={() => setModal("task")} events={state.events} autoPlan={autoPlan}/>} 
      {view === "Calendar" && <CalendarView events={state.events.filter((item) => classFilter === "all" || item.classId === classFilter)} classes={classes} add={() => setModal("event")} autoPlan={autoPlan}/>} 
      {view === "Focus" && <FocusStudio state={state} classFilter={classFilter === "all" ? classes[0]?.id : classFilter} complete={completeStudySession}/>} 
      {view === "Notes" && <NotesView notes={filteredNotes} classes={classes} add={() => setModal("note")} update={updateNote} remove={(id) => setState((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }))}/>} 
      {view === "Math lab" && <MathLab materials={filteredMaterials}/>} 
      {view === "Progress" && <ProgressView state={state} classFilter={classFilter}/>} 
      {view === "Settings" && <SettingsView state={state} setState={setState} aiStatus={aiStatus} exportBackup={exportBackup} importBackup={() => importRef.current?.click()} installPrompt={installPrompt} install={async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } }}/>} 
    </div></section>
    <nav className="sb2-mobile-nav" aria-label="Mobile navigation">{NAV.map((item) => <button key={item.view} className={view === item.view ? "active" : ""} onClick={() => setView(item.view)}><span>{item.icon}</span>{item.view}</button>)}</nav>
    <ToolDock/>
    <input ref={importRef} type="file" accept="application/json" hidden onChange={importBackup}/>{modal && <AppModal kind={modal} state={state} close={() => setModal(null)} saveClass={saveClass} saveTask={saveTask} saveNote={saveNote} saveEvent={saveEvent} saveProfile={(profile) => { setState((current) => ({ ...current, profile })); setModal(null); setToast("Your StudyBloom profile is personalized."); }} upload={handleFile}/>} {processing.active && <div className="sb2-processing"><div className="sb2-process-card"><span>✦</span><h2>Growing your study kit</h2><p>{processing.label}</p><div><i style={{ width: `${processing.percent}%` }}/></div><small>{processing.percent}%</small></div></div>} {toast && <div className="sb2-toast">✦ {toast}</div>}
  </main>;
}

function PageHeader({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) { return <div className="sb2-page-head"><div><small>{eyebrow}</small><h1>{title}</h1><p>{copy}</p></div>{action}</div>; }
