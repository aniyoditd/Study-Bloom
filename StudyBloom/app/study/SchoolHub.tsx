"use client";

import { useMemo, useState } from "react";
import { classById, classMetrics } from "./progress";
import type { StudyState, StudyTask, View } from "./types";

export type ExamPlanInput = {
  classId: string;
  title: string;
  examDate: string;
  topics: string;
  notes: string;
  minutes: number;
  daysPerWeek: number;
  materialIds: string[];
};

const today = () => new Date().toISOString().slice(0, 10);
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function SchoolHub({ state, addAssignment, toggle, setStatus, updateProgress, openView, createPlan }: { state: StudyState; addAssignment: () => void; toggle: (id: string) => void; setStatus: (id: string, status: NonNullable<StudyTask["status"]>) => void; updateProgress: (id: string, progress: number) => void; openView: (view: View) => void; createPlan: (input: ExamPlanInput) => void }) {
  const [builder, setBuilder] = useState(false);
  const [classId, setClassId] = useState(state.classes[0]?.id || "");
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 21); return date.toISOString().slice(0, 10); });
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState(45);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const open = state.tasks.filter((task) => !task.done && task.status !== "Submitted").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const submitted = state.tasks.filter((task) => task.done || task.status === "Submitted");
  const dueToday = open.filter((task) => task.dueDate === today());
  const overdue = open.filter((task) => task.dueDate < today());
  const upcoming = state.events.filter((event) => event.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const completion = state.tasks.length ? Math.round(submitted.length / state.tasks.length * 100) : 0;
  const selectedMaterials = state.materials.filter((material) => material.classId === classId);
  const weeks = useMemo(() => Math.max(1, Math.ceil((new Date(`${examDate}T12:00`).getTime() - Date.now()) / 604800000)), [examDate]);

  const submitPlan = () => {
    if (!title.trim() || !examDate) return;
    createPlan({ classId, title, examDate, topics, notes, minutes, daysPerWeek, materialIds });
    setBuilder(false); setTitle(""); setTopics(""); setNotes(""); setMaterialIds([]);
  };

  return <>
    <section className="sb3-campus-hero"><div><small>{state.profile.schoolName.toUpperCase()}</small><h1>Schoolwork command center</h1><p>{state.profile.motto} Classes, homework, learning materials, study time, and exam prep—all connected.</p><div><button className="sb2-primary" onClick={addAssignment}>＋ Add schoolwork</button><button onClick={() => setBuilder(true)}>✦ Build exam plan</button></div></div><aside><span>{completion}%</span><b>work completed</b><p>{dueToday.length} due today · {overdue.length} overdue</p></aside></section>
    <section className="sb3-campus-stats"><article><span>✓</span><div><small>DUE TODAY</small><b>{dueToday.length}</b><p>{dueToday.reduce((sum, task) => sum + task.minutes, 0)} planned minutes</p></div></article><article><span>!</span><div><small>OVERDUE</small><b>{overdue.length}</b><p>{overdue.length ? "Needs attention" : "You’re on track"}</p></div></article><article><span>▤</span><div><small>COURSEWORK</small><b>{open.length}</b><p>open assignments</p></div></article><article><span>□</span><div><small>NEXT MILESTONE</small><b>{upcoming[0] ? dateLabel(upcoming[0].date) : "—"}</b><p>{upcoming[0]?.title || "Nothing scheduled"}</p></div></article></section>
    <div className="sb3-school-layout"><section className="sb2-panel sb3-coursework"><div className="sb2-panel-head"><div><small>HOMEWORK HUB</small><h2>Active schoolwork</h2></div><button onClick={addAssignment}>＋ New</button></div>{open.length ? open.slice(0, 8).map((task) => { const klass = classById(state.classes, task.classId); return <article key={task.id}><button className="sb3-check" onClick={() => toggle(task.id)}>○</button><i style={{ background: klass.color }}/><div><small>{klass.code} · {task.category || "Homework"} · {task.priority || "Normal"}</small><b>{task.title}</b><p>{task.details || `${task.minutes} minute work block`}</p><div className="sb3-work-progress"><label><span>{task.progress || 0}% complete</span><input aria-label={`Progress for ${task.title}`} type="range" min="0" max="100" step="5" value={task.progress || 0} onChange={(event) => updateProgress(task.id, Number(event.target.value))}/></label><small>{task.timeSpent || 0} min logged · {task.sessions || 0} session{task.sessions === 1 ? "" : "s"}</small></div><footer><time className={task.dueDate < today() ? "late" : ""}>Due {dateLabel(task.dueDate)}</time><select aria-label={`Status for ${task.title}`} value={task.status || "To do"} onChange={(event) => setStatus(task.id, event.target.value as NonNullable<StudyTask["status"]>)}><option>To do</option><option>In progress</option><option>Submitted</option></select></footer></div></article>; }) : <div className="sb2-mini-empty">No open assignments. Add schoolwork when something new is assigned.</div>}</section>
      <aside><section className="sb2-panel sb3-classrooms"><div className="sb2-panel-head"><div><small>CLASSROOMS</small><h2>Your courses</h2></div><button onClick={() => openView("Classes")}>Manage →</button></div>{state.classes.map((klass) => { const metrics = classMetrics(state, klass.id); const classOpen = open.filter((task) => task.classId === klass.id).length; return <button key={klass.id} onClick={() => openView("Classes")}><span style={{ background: `${klass.color}1c`, color: klass.color }}>{klass.icon}</span><div><b>{klass.name}</b><small>{klass.code} · {classOpen} open · {metrics.overall}% mastery</small><i><em style={{ width: `${metrics.overall}%`, background: klass.color }}/></i></div></button>; })}</section><section className="sb2-panel sb3-campus-links"><div className="sb2-panel-head"><div><small>LEARNING SPACES</small><h2>Open a workspace</h2></div></div><div><button onClick={() => openView("Library")}><span>▤</span>Materials<small>Files & study kits</small></button><button onClick={() => openView("Notes")}><span>✎</span>Notebook<small>Text, math & ink</small></button><button onClick={() => openView("Focus")}><span>◷</span>Study room<small>Pomodoro & stopwatch</small></button><button onClick={() => openView("Progress")}><span>↗</span>Gradebook<small>Scores & mastery</small></button></div></section></aside></div>
    {builder && <div className="sb2-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setBuilder(false)}><section className="sb3-plan-builder" role="dialog" aria-modal="true" aria-label="Exam study plan builder"><button className="sb2-modal-close" onClick={() => setBuilder(false)}>×</button><header><span>✦</span><div><small>PERSONAL STUDY COACH</small><h2>Build an exam study plan</h2><p>StudyBloom will spread guide review, practice, flashcards, and mock tests across your available days.</p></div></header><div className="sb3-builder-grid"><label>Class<select value={classId} onChange={(event) => { setClassId(event.target.value); setMaterialIds([]); }}>{state.classes.map((klass) => <option value={klass.id} key={klass.id}>{klass.name}</option>)}</select></label><label>Exam name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Calculus midterm"/></label><label>Exam date<input type="date" min={today()} value={examDate} onChange={(event) => setExamDate(event.target.value)}/></label><label>Minutes per study day<input type="number" min="15" max="240" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}/></label><label>Study days each week<input type="range" min="2" max="7" value={daysPerWeek} onChange={(event) => setDaysPerWeek(Number(event.target.value))}/><b>{daysPerWeek} days</b></label><label>Topics to cover<textarea value={topics} onChange={(event) => setTopics(event.target.value)} placeholder="Limits, derivatives, related rates..."/></label><label className="wide">What do you know about the exam?<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Format, chapters, professor guidance, areas you find difficult..."/></label></div><fieldset><legend>Use these notes and guides</legend>{selectedMaterials.length ? selectedMaterials.map((material) => <label key={material.id}><input type="checkbox" checked={materialIds.includes(material.id)} onChange={() => setMaterialIds((current) => current.includes(material.id) ? current.filter((id) => id !== material.id) : [...current, material.id])}/><span>▤</span><div><b>{material.title}</b><small>{material.source}</small></div></label>) : <p>No study kits in this class yet. You can still build a topic-based plan.</p>}</fieldset><footer><div><b>{weeks} week{weeks === 1 ? "" : "s"} to prepare</b><small>About {Math.max(1, weeks * daysPerWeek)} focused sessions</small></div><button className="sb2-primary" disabled={!title.trim()} onClick={submitPlan}>Create daily plan →</button></footer></section></div>}
  </>;
}
