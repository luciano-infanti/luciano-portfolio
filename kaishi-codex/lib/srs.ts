import type { Card, ReviewQuality } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASINESS_FACTOR = 1.3;
const DEFAULT_EASINESS_FACTOR = 2.5;

const easinessDelta: Record<ReviewQuality, number> = {
  1: -0.2,
  2: -0.15,
  3: 0,
  4: 0.25,
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function scheduleNextReview(
  card: Card,
  quality: ReviewQuality,
  now = Date.now(),
): Card {
  const nextEasinessFactor = Math.max(
    MIN_EASINESS_FACTOR,
    roundToTwo((card.easinessFactor || DEFAULT_EASINESS_FACTOR) + easinessDelta[quality]),
  );

  let interval = 1;
  let repetitionCount = 0;

  if (quality > 1) {
    repetitionCount = card.repetitionCount + 1;

    if (card.repetitionCount === 0) {
      interval = 1;
    } else if (card.repetitionCount === 1) {
      interval = 6;
    } else {
      interval = Math.max(1, Math.round(card.interval * nextEasinessFactor));
    }
  }

  return {
    ...card,
    interval,
    easinessFactor: nextEasinessFactor,
    repetitionCount,
    dueDate: now + interval * DAY_MS,
    lastReviewedAt: now,
    updatedAt: now,
  };
}

export function isDue(card: Card, now = Date.now()) {
  return !card.suspended && card.dueDate <= now;
}

export function qualityLabel(quality: ReviewQuality) {
  return ({ 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" } as const)[quality];
}
