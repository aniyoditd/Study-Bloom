export type View = "Home" | "School hub" | "Classes" | "Course" | "Library" | "Study" | "Planner" | "Calendar" | "Focus" | "Notes" | "Math lab" | "Progress" | "Settings";
export type QuestionType = "Multiple choice" | "True / False" | "Open ended";

export type ClassRoom = {
  id: string;
  name: string;
  subject: string;
  code: string;
  instructor: string;
  color: string;
  icon: string;
  term: string;
  description?: string;
  room?: string;
  meetingTime?: string;
  syllabus?: string;
};

export type Flashcard = { id: string; term: string; definition: string; topic: string };
export type Question = {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
  type: QuestionType;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options?: string[];
};

export type Material = {
  id: string;
  classId: string;
  title: string;
  source: string;
  sourceType?: "PDF" | "Document" | "Slides" | "Text" | "Image" | "Audio";
  createdAt: string;
  pages: number;
  summary: string;
  guide: string[];
  formulas: string[];
  flashcards: Flashcard[];
  questions: Question[];
  ocrUsed: boolean;
  aiGenerated: boolean;
};

export type StudyTask = {
  id: string;
  classId: string;
  title: string;
  dueDate: string;
  minutes: number;
  done: boolean;
  source: "manual" | "auto-plan";
  category?: "Homework" | "Project" | "Reading" | "Quiz prep" | "Study";
  priority?: "Low" | "Normal" | "High";
  status?: "To do" | "In progress" | "Submitted";
  details?: string;
  progress?: number;
  timeSpent?: number;
  sessions?: number;
};

export type StudyNote = {
  id: string;
  classId: string;
  title: string;
  body: string;
  updatedAt: string;
};

export type CalendarEvent = {
  id: string;
  classId: string;
  title: string;
  date: string;
  type: "Exam" | "Assignment" | "Study" | "Class";
};

export type CardProgress = {
  cardId: string;
  classId: string;
  materialId: string;
  interval: number;
  ease: number;
  reviews: number;
  correct: number;
  nextReview: string;
  lastRating: "Again" | "Hard" | "Good" | "Easy";
};

export type ExamAttempt = {
  id: string;
  classId: string;
  materialId: string;
  createdAt: string;
  score: number;
  total: number;
  percentage: number;
  answers: Record<string, string>;
  work?: Record<string, string>;
  drawings?: Record<string, unknown[]>;
  topicScores: Record<string, { earned: number; possible: number }>;
};

export type Activity = {
  id: string;
  classId: string;
  kind: "flashcard" | "exam" | "practice" | "focus" | "task" | "note" | "upload";
  value: number;
  label: string;
  createdAt: string;
};

export type Settings = {
  aiEnabled: boolean;
  ocrEnabled: boolean;
  notifications: boolean;
  focusMinutes: number;
  breakMinutes: number;
  weeklyGoalMinutes: number;
};

export type StudyState = {
  version: 3;
  profile: { name: string; xp: number; streak: number; avatar: string; schoolName: string; gradeLevel: string; motto: string; accent: string; dailyGoalMinutes: number };
  classes: ClassRoom[];
  materials: Material[];
  tasks: StudyTask[];
  notes: StudyNote[];
  events: CalendarEvent[];
  cardProgress: Record<string, CardProgress>;
  attempts: ExamAttempt[];
  activities: Activity[];
  settings: Settings;
};

export type StudyKitPayload = {
  summary: string;
  guide: string[];
  formulas: string[];
  flashcards: Array<{ term: string; definition: string; topic: string }>;
  questions: Array<Omit<Question, "id">>;
};
