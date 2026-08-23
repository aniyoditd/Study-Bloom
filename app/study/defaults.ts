import type { StudyState } from "./types";

const now = new Date();
const iso = (offset = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

export const DEFAULT_STATE: StudyState = {
  version: 3,
  profile: { name: "Alex Johnson", xp: 0, xpVersion: 2, streak: 5, avatar: "🌱", schoolName: "My StudyBloom Academy", gradeLevel: "Student", motto: "Small steps, strong results.", accent: "#7557c7", dailyGoalMinutes: 60 },
  classes: [
    { id: "bio-101", name: "General Biology", subject: "Science", code: "BIO 101", instructor: "Dr. Rivera", color: "#7b5ccc", icon: "🧬", term: "Fall 2026", room: "Science 214", meetingTime: "Mon/Wed 10:00–11:15 AM", description: "Explore how cells, organisms, and ecosystems work through connected lectures, labs, and active-recall study.", syllabus: "Office hours: Tuesday 2–4 PM. Coursework includes weekly problem sets, two midterms, lab reports, and a cumulative final." },
    { id: "hist-204", name: "Modern World History", subject: "History", code: "HIST 204", instructor: "Prof. Chen", color: "#d88760", icon: "🏛️", term: "Fall 2026", room: "Humanities 108", meetingTime: "Tue/Thu 1:00–2:15 PM", description: "Trace political, economic, and social change across the modern world using primary sources and historical arguments." },
    { id: "math-121", name: "Calculus I", subject: "Math", code: "MATH 121", instructor: "Dr. Patel", color: "#4d83be", icon: "∑", term: "Fall 2026", room: "Math 305", meetingTime: "Mon/Wed/Fri 9:00–9:50 AM", description: "Build a practical understanding of limits, derivatives, applications, and mathematical reasoning." },
  ],
  materials: [
    {
      id: "cellular-respiration",
      classId: "bio-101",
      title: "Cellular Respiration",
      source: "Week 4 lecture.pdf",
      createdAt: now.toISOString(),
      pages: 14,
      summary: "Cells release usable energy from glucose through glycolysis, the citric acid cycle, and oxidative phosphorylation.",
      guide: [
        "Glycolysis splits glucose in the cytoplasm and produces a small amount of ATP and NADH.",
        "Pyruvate oxidation prepares carbon molecules for the citric acid cycle.",
        "The citric acid cycle transfers high-energy electrons to NADH and FADH₂.",
        "The electron transport chain creates a proton gradient that powers ATP synthase.",
        "Oxygen is the final electron acceptor in aerobic respiration.",
      ],
      formulas: ["C_6H_{12}O_6 + 6O_2 \\rightarrow 6CO_2 + 6H_2O + ATP"],
      flashcards: [
        { id: "card-atp", term: "ATP", definition: "The cell’s primary energy-carrying molecule.", topic: "Energy" },
        { id: "card-glycolysis", term: "Glycolysis", definition: "The first stage of glucose breakdown, occurring in the cytoplasm.", topic: "Glycolysis" },
        { id: "card-etc", term: "Electron transport chain", definition: "A membrane protein series that creates the proton gradient used to make ATP.", topic: "Oxidative phosphorylation" },
        { id: "card-oxygen", term: "Final electron acceptor", definition: "Oxygen accepts electrons and combines with hydrogen to form water.", topic: "Oxidative phosphorylation" },
      ],
      questions: [
        { id: "q-bio-1", prompt: "Where does glycolysis occur?", answer: "In the cytoplasm.", explanation: "Glycolysis does not require a mitochondrion and takes place in the cytosol.", type: "Multiple choice", topic: "Glycolysis", difficulty: "Easy", options: ["Cytoplasm", "Nucleus", "Golgi apparatus", "Lysosome"] },
        { id: "q-bio-2", prompt: "Oxygen is the final electron acceptor in aerobic respiration.", answer: "True", explanation: "Oxygen accepts electrons at the end of the electron transport chain.", type: "True / False", topic: "Oxidative phosphorylation", difficulty: "Easy", options: ["True", "False"] },
        { id: "q-bio-3", prompt: "Explain how a proton gradient helps produce ATP.", answer: "Protons flow down their electrochemical gradient through ATP synthase, providing energy to phosphorylate ADP into ATP.", explanation: "A complete answer links chemiosmosis, ATP synthase, ADP, and phosphate.", type: "Open ended", topic: "Oxidative phosphorylation", difficulty: "Hard" },
      ],
      ocrUsed: false,
      aiGenerated: false,
    },
    {
      id: "french-revolution",
      classId: "hist-204",
      title: "The French Revolution",
      source: "Chapter 6 notes.pdf",
      createdAt: now.toISOString(),
      pages: 22,
      summary: "Economic crisis, social inequality, and Enlightenment ideas destabilized the ancien régime and transformed French politics.",
      guide: ["France’s fiscal crisis exposed structural weaknesses in the monarchy.", "The Third Estate formed the National Assembly in 1789.", "The Declaration of the Rights of Man reframed citizenship and equality.", "War and internal conflict contributed to the radical Reign of Terror."],
      formulas: [],
      flashcards: [
        { id: "card-estates", term: "Estates-General", definition: "The representative assembly of the three estates of pre-revolutionary France.", topic: "Origins" },
        { id: "card-assembly", term: "National Assembly", definition: "The body formed by representatives of the Third Estate in June 1789.", topic: "1789" },
        { id: "card-terror", term: "Reign of Terror", definition: "The radical period of political violence from 1793 to 1794.", topic: "Radical phase" },
      ],
      questions: [
        { id: "q-hist-1", prompt: "In what year did the Estates-General meet?", answer: "1789", explanation: "Louis XVI convened it in May 1789.", type: "Open ended", topic: "Origins", difficulty: "Easy" },
        { id: "q-hist-2", prompt: "Which group formed the National Assembly?", answer: "The Third Estate", explanation: "Its representatives claimed to speak for the nation.", type: "Multiple choice", topic: "1789", difficulty: "Medium", options: ["The Third Estate", "The clergy", "The nobility", "The royal army"] },
      ],
      ocrUsed: false,
      aiGenerated: false,
    },
  ],
  tasks: [
    { id: "task-1", classId: "bio-101", title: "Review respiration flashcards", dueDate: iso(0), minutes: 25, done: false, source: "manual", category: "Quiz prep", priority: "High", status: "In progress", details: "Focus on oxidative phosphorylation and ATP yield.", progress: 45, timeSpent: 15, sessions: 1 },
    { id: "task-2", classId: "math-121", title: "Complete derivative practice set", dueDate: iso(0), minutes: 45, done: false, source: "manual", category: "Homework", priority: "High", status: "To do", details: "Problems 1–18; show every derivative step.", progress: 10, timeSpent: 5, sessions: 1 },
    { id: "task-3", classId: "hist-204", title: "Outline Chapter 7", dueDate: iso(1), minutes: 35, done: true, source: "manual", category: "Reading", priority: "Normal", status: "Submitted", details: "Include three primary-source connections.", progress: 100, timeSpent: 40, sessions: 2 },
  ],
  notes: [{ id: "note-1", classId: "bio-101", title: "Questions for office hours", body: "Why does fermentation regenerate NAD+?\nHow is ATP yield measured experimentally?", updatedAt: now.toISOString() }],
  events: [
    { id: "event-1", classId: "bio-101", title: "Unit 2 exam", date: iso(9), type: "Exam" },
    { id: "event-2", classId: "hist-204", title: "Primary source essay", date: iso(5), type: "Assignment" },
    { id: "event-3", classId: "math-121", title: "Problem set 5", date: iso(2), type: "Assignment" },
  ],
  cardProgress: {},
  attempts: [],
  activities: [
    { id: "activity-1", classId: "bio-101", kind: "focus", value: 25, label: "Focused for 25 minutes", createdAt: new Date(now.getTime() - 86400000).toISOString() },
    { id: "activity-2", classId: "hist-204", kind: "practice", value: 8, label: "Answered 8 practice questions", createdAt: new Date(now.getTime() - 172800000).toISOString() },
  ],
  settings: { aiEnabled: false, ocrEnabled: true, notifications: false, focusMinutes: 25, breakMinutes: 5, weeklyGoalMinutes: 420 },
};
