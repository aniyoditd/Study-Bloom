# StudyBloom v3 — Mini Online School

StudyBloom is a lavender-and-white, local-first schoolwork hub, study website, and installable app. Organize classes and homework, turn course files into complete study kits, handwrite with Apple Pencil, prepare for exams, and track your learning in one place.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and stop the app with `Ctrl+C` when finished.

For a production check, run `npm run build`.

## Included features

- Classes and subjects with course code, instructor, term, icon, and color
- A mini online school hub for homework, projects, readings, priorities, instructions, status, and deadlines
- A class filter that keeps materials, tasks, notes, calendar items, and progress organized
- Local intake for PDF, DOC, DOCX, PPTX, TXT, Markdown, CSV, JSON, HTML, RTF, and common image formats
- Optional audio transcription for MP3, M4A, WAV, WebM, OGG, FLAC, and MP4 files
- Local OCR for scanned PDFs and image notes
- Full study kits containing a summary, key ideas, formulas, flashcards, and practice questions
- Optional AI-enhanced generation and semantic grading with a server-side OpenAI API key
- Spaced-repetition flashcards with Again, Hard, Good, and Easy review schedules
- Practice questions with answer feedback and partial credit for open-ended answers
- Configurable mock exams with 5–50 questions, selected types, difficulty, typed work areas, and per-question whiteboards
- Complete progress tracking for tests, topics, flashcards, focus sessions, tasks, uploads, practice, and notes
- Autosaved homework percentages, assignment status, time spent, session counts, and study-clock activity
- A detailed exam plan builder that schedules daily/weekly learning, practice, recall, and mock-test sessions until exam day
- Study planner, homework list, monthly academic calendar, and automatic exam study plans
- Pomodoro focus/break cycles and an open-ended stopwatch with laps and session logging
- Math-ready notes with LaTeX shortcuts and a live rendered preview
- Math Lab with an equation renderer, function grapher, formula library, and grade calculator
- Always-available scientific calculator and graphing popup
- Apple Pencil, touch, and mouse whiteboard with pen colors, eraser, undo, persistent ink, and PNG export
- Personal profile with avatar, school name, grade or role, motto, accent color, and daily study goal
- Custom StudyBloom book-and-sprout favicon and installable app icon
- Personal streak, XP, levels, class colors, and class icons
- Installable PWA shell and offline access to previously loaded app assets
- Full JSON backup export and restore
- Responsive layout for desktop, tablet, and mobile

## Optional OpenAI setup

StudyBloom works without an API key using its built-in local study-kit generator and local grading. To enable deeper AI-generated guides, semantic grading, and audio transcription:

1. Copy `.env.example` to `.env.local`.
2. Add your key as `OPENAI_API_KEY=...`.
3. Optionally change `OPENAI_MODEL` or `OPENAI_TRANSCRIBE_MODEL`.
4. Restart `npm run dev`.
5. Open **Settings** and enable AI-enhanced study tools.

The key stays on the local server and is never placed in browser code. Extracted class text and uploaded audio are sent to OpenAI only when AI-enhanced tools are enabled. Local mode does not send class files externally.

## Privacy and data

- StudyBloom saves classes, study kits, schedules, notes, and progress in this browser on this device.
- Use **Settings → Export backup** before clearing browser data or moving to another computer.
- OCR runs locally. The first OCR use may need to fetch its language data if it is not already cached.
- Review generated material against the original source before relying on it for graded work.
- Class files are processed for text but the originals are not stored by StudyBloom.

## Suggested first run

1. Personalize your avatar, name, school, grade, motto, color, and daily goal from the profile button.
2. Add each class with a subject and color.
3. Upload a PDF, document, slide deck, image, text file, or audio lecture into the matching class.
4. Review the generated guide, then complete the due flashcards.
5. Open **School hub → Build exam plan** and add your exam details, topics, notes, and guides.
6. Export a backup after you have added important work.
