import type { Activity, CardProgress, ClassRoom, ExamAttempt, StudyState } from "./types";

export function classMetrics(state: StudyState, classId: string) {
  const materials = state.materials.filter((item) => item.classId === classId);
  const cardIds = new Set(materials.flatMap((material) => material.flashcards.map((card) => card.id)));
  const cards = Object.values(state.cardProgress).filter((progress) => cardIds.has(progress.cardId));
  const mastered = cards.filter((progress) => progress.interval >= 14 && progress.ease >= 2.2).length;
  const attempts = state.attempts.filter((attempt) => attempt.classId === classId);
  const examAverage = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length) : 0;
  const focusMinutes = state.activities.filter((activity) => activity.classId === classId && activity.kind === "focus").reduce((sum, activity) => sum + activity.value, 0);
  const tasks = state.tasks.filter((task) => task.classId === classId);
  const taskRate = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + (task.done ? 100 : task.progress || 0), 0) / tasks.length) : 0;
  const totalCards = materials.reduce((sum, material) => sum + material.flashcards.length, 0);
  const flashcardMastery = totalCards ? Math.round((mastered / totalCards) * 100) : 0;
  const overall = Math.round((flashcardMastery + (examAverage || 0) + taskRate) / (examAverage ? 3 : 2));
  return { materials: materials.length, totalCards, mastered, flashcardMastery, examAverage, attempts: attempts.length, focusMinutes, taskRate, overall };
}

export function reviewProgress(previous: CardProgress | undefined, cardId: string, materialId: string, classId: string, rating: CardProgress["lastRating"]): CardProgress {
  const base = previous ?? { cardId, classId, materialId, interval: 0, ease: 2.3, reviews: 0, correct: 0, nextReview: new Date().toISOString(), lastRating: "Again" as const };
  const multipliers = { Again: 0, Hard: 1.35, Good: 2.25, Easy: 3.4 };
  const interval = rating === "Again" ? 0 : Math.max(rating === "Hard" ? 1 : 2, Math.round(Math.max(1, base.interval) * multipliers[rating]));
  const ease = Math.max(1.3, base.ease + ({ Again: -0.2, Hard: -0.08, Good: 0.05, Easy: 0.14 }[rating]));
  const next = new Date();
  if (rating === "Again") next.setMinutes(next.getMinutes() + 10);
  else next.setDate(next.getDate() + interval);
  return { ...base, interval, ease, reviews: base.reviews + 1, correct: base.correct + (rating === "Again" ? 0 : 1), nextReview: next.toISOString(), lastRating: rating };
}

export function dueCards(state: StudyState, classId?: string) {
  const now = Date.now();
  return state.materials
    .filter((material) => !classId || material.classId === classId)
    .flatMap((material) => material.flashcards.map((card) => ({ material, card, progress: state.cardProgress[card.id] })))
    .filter(({ progress }) => !progress || new Date(progress.nextReview).getTime() <= now);
}

export function activitySeries(activities: Activity[], classId: string | null, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const value = activities.filter((activity) => (!classId || activity.classId === classId) && activity.createdAt.slice(0, 10) === key).reduce((sum, activity) => sum + (activity.kind === "focus" ? activity.value : Math.max(5, activity.value)), 0);
    return { label: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1), value };
  });
}

export function weakestTopics(attempts: ExamAttempt[], classId: string) {
  const aggregate: Record<string, { earned: number; possible: number }> = {};
  attempts.filter((attempt) => attempt.classId === classId).forEach((attempt) => {
    Object.entries(attempt.topicScores).forEach(([topic, score]) => {
      aggregate[topic] ??= { earned: 0, possible: 0 };
      aggregate[topic].earned += score.earned;
      aggregate[topic].possible += score.possible;
    });
  });
  return Object.entries(aggregate).map(([topic, score]) => ({ topic, percentage: Math.round((score.earned / Math.max(1, score.possible)) * 100) })).sort((a, b) => a.percentage - b.percentage).slice(0, 4);
}

export function classById(classes: ClassRoom[], id: string) {
  return classes.find((classRoom) => classRoom.id === id) ?? classes[0];
}
