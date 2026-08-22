import type { Question, StudyKitPayload } from "./types";

const stop = new Set("about after again against also among because before being between could every first from have into itself just more most other over same should some such than that their them then there these they this through under very what when where which while will with would your class lecture notes chapter page using used were been".split(" "));

export function cleanSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 38 && sentence.length <= 320);
}

function keywords(text: string) {
  const counts = new Map<string, number>();
  const original = new Map<string, string>();
  for (const token of text.match(/[A-Za-z][A-Za-z-]{3,}/g) ?? []) {
    const key = token.toLowerCase();
    if (stop.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!original.has(key)) original.set(key, token);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([key]) => original.get(key) ?? key);
}

function topicFor(sentence: string, terms: string[]) {
  return terms.find((term) => sentence.toLowerCase().includes(term.toLowerCase())) ?? "Core concepts";
}

function distractors(answer: string, pool: string[]) {
  const options = pool.filter((item) => item !== answer).slice(0, 3);
  while (options.length < 3) options.push(["A related but different concept", "The reverse process", "None of the above"][options.length]);
  return [answer, ...options].sort(() => 0.5 - Math.random());
}

export function buildLocalStudyKit(text: string, title: string): StudyKitPayload {
  const source = cleanSentences(text);
  const terms = keywords(text);
  const ranked = source
    .map((sentence) => ({ sentence, score: terms.filter((term) => sentence.toLowerCase().includes(term.toLowerCase())).length }))
    .sort((a, b) => b.score - a.score);
  const guide = [...new Set(ranked.map((item) => item.sentence))].slice(0, 12);
  const safeGuide = guide.length ? guide : [
    `Identify the central claim or process in ${title}.`,
    "Connect each key term to a specific example from the source.",
    "Explain the topic aloud without looking at the original document.",
    "Write one question for every major heading and answer it from memory.",
  ];
  const flashcards = (terms.length ? terms : ["Core concept", "Key evidence", "Application", "Common misconception"]).slice(0, 16).map((term, index) => ({
    term,
    definition: source.find((sentence) => sentence.toLowerCase().includes(term.toLowerCase())) ?? safeGuide[index % safeGuide.length],
    topic: topicFor(source.find((sentence) => sentence.toLowerCase().includes(term.toLowerCase())) ?? "", terms.slice(0, 6)),
  }));
  const questions: Array<Omit<Question, "id">> = safeGuide.slice(0, 12).map((sentence, index) => {
    const topic = topicFor(sentence, terms.slice(0, 8));
    if (index % 3 === 0) {
      return { prompt: `Which statement best explains ${topic}?`, answer: sentence, explanation: sentence, type: "Multiple choice", topic, difficulty: index > 6 ? "Hard" : "Medium", options: distractors(sentence, safeGuide) };
    }
    if (index % 3 === 1) {
      return { prompt: `${sentence.replace(/[.!?]$/, "")} — true or false?`, answer: "True", explanation: sentence, type: "True / False", topic, difficulty: "Easy", options: ["True", "False"] };
    }
    return { prompt: `Explain this idea in your own words: ${sentence.split(" ").slice(0, 10).join(" ")}…`, answer: sentence, explanation: sentence, type: "Open ended", topic, difficulty: "Hard" };
  });
  const formulaMatches = text.match(/(?:[A-Za-z0-9_{}()+\-]+\s*){2,}(?:=|→|->)(?:\s*[A-Za-z0-9_{}()+\-]+){1,}/g) ?? [];
  return {
    summary: safeGuide.slice(0, 2).join(" "),
    guide: safeGuide,
    formulas: formulaMatches.slice(0, 8).map((formula) => formula.replace(/->/g, "\\rightarrow")),
    flashcards,
    questions,
  };
}

export function localSemanticScore(answer: string, expected: string) {
  const tokenize = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length > 2 && !stop.has(word)) ?? []);
  const actual = tokenize(answer);
  const target = tokenize(expected);
  if (!answer.trim()) return 0;
  if (!target.size) return answer.trim().toLowerCase() === expected.trim().toLowerCase() ? 1 : 0;
  const overlap = [...target].filter((word) => actual.has(word)).length;
  return Math.min(1, overlap / Math.max(2, target.size * 0.68));
}
