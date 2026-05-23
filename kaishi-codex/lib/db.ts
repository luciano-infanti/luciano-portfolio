"use client";

import Dexie, { type Table } from "dexie";
import type { Card, Deck, ReviewLog } from "@/lib/types";

const DEFAULT_DECK_NAME = "Default";
const DEFAULT_SEED_KEY = "kaishi_1500_v1";
const DEFAULT_SEED_URL = "/data/kaishi_1500.json";

type SeedEntry = {
  word?: unknown;
  reading?: unknown;
  meaning?: unknown;
  meanings?: unknown;
  jlpt?: unknown;
  jlptLevel?: unknown;
  partOfSpeech?: unknown;
};

class KaishiDatabase extends Dexie {
  cards!: Table<Card, number>;
  decks!: Table<Deck, number>;
  reviewLogs!: Table<ReviewLog, number>;

  constructor() {
    super("kaishi");
    this.version(1).stores({
      cards: "++id, deckId, word, reading, dueDate, suspended, createdAt",
      decks: "++id, name, createdAt",
      reviewLogs: "++id, cardId, reviewedAt, quality",
    });
  }
}

export const db = new KaishiDatabase();
let defaultSeedPromise: Promise<void> | null = null;

export async function ensureDeck(name = "Default") {
  const existing = await db.decks.where("name").equals(name).first();

  if (existing?.id) {
    return existing.id;
  }

  return db.decks.add({
    name,
    createdAt: Date.now(),
  });
}

export async function ensureDefaultDeck() {
  const deckId = await ensureDeck(DEFAULT_DECK_NAME);

  if (!defaultSeedPromise) {
    defaultSeedPromise = seedDefaultDeck(deckId).finally(() => {
      defaultSeedPromise = null;
    });
  }

  await defaultSeedPromise;
  return deckId;
}

async function seedDefaultDeck(deckId: number) {
  const deck = await db.decks.get(deckId);

  if (deck?.seedKey === DEFAULT_SEED_KEY) {
    return;
  }

  let seed: NormalizedSeedEntry[];

  try {
    const response = await fetch(DEFAULT_SEED_URL);

    if (!response.ok) {
      return;
    }

    const raw = (await response.json()) as unknown;
    seed = normalizeSeedEntries(raw);
  } catch {
    return;
  }

  if (!seed.length) {
    return;
  }

  const existingCards = await db.cards.where("deckId").equals(deckId).toArray();
  const knownKeys = new Set(existingCards.map((card) => cardKey(card.word, card.reading)));
  const now = Date.now();
  const cards: Card[] = [];

  for (const entry of seed) {
    const key = cardKey(entry.word, entry.reading);

    if (knownKeys.has(key)) {
      continue;
    }

    knownKeys.add(key);
    cards.push({
      deckId,
      word: entry.word,
      reading: entry.reading,
      furigana: entry.reading,
      meaning: entry.meaning,
      partOfSpeech: entry.partOfSpeech,
      jlptLevel: entry.jlptLevel,
      interval: 0,
      easinessFactor: 2.5,
      repetitionCount: 0,
      dueDate: now,
      suspended: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (cards.length) {
    await db.cards.bulkAdd(cards);
  }

  await db.decks.update(deckId, {
    seedKey: DEFAULT_SEED_KEY,
    seededAt: now,
    seedCount: seed.length,
  });
}

type NormalizedSeedEntry = {
  word: string;
  reading: string;
  meaning: string;
  jlptLevel?: string;
  partOfSpeech: string[];
};

function normalizeSeedEntries(raw: unknown): NormalizedSeedEntry[] {
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "cards" in raw && Array.isArray(raw.cards)
      ? raw.cards
      : [];
  const entries: NormalizedSeedEntry[] = [];
  const seen = new Set<string>();

  for (const item of items as SeedEntry[]) {
    const entry = normalizeSeedEntry(item);

    if (!entry) {
      continue;
    }

    const key = cardKey(entry.word, entry.reading);

    if (!seen.has(key)) {
      seen.add(key);
      entries.push(entry);
    }
  }

  return entries;
}

function normalizeSeedEntry(entry: SeedEntry): NormalizedSeedEntry | null {
  const word = cleanString(entry.word);
  const reading = cleanString(entry.reading);
  const meaning = normalizeMeaning(entry.meaning, entry.meanings);

  if (!word || !reading || !meaning) {
    return null;
  }

  return {
    word,
    reading,
    meaning,
    jlptLevel: cleanString(entry.jlptLevel) || cleanString(entry.jlpt),
    partOfSpeech: normalizeStringArray(entry.partOfSpeech),
  };
}

function normalizeMeaning(meaning: unknown, meanings: unknown) {
  const values = normalizeStringArray(meanings);

  if (values.length) {
    return values.join("; ");
  }

  return cleanString(meaning);
}

function normalizeStringArray(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of values) {
    const cleaned = cleanString(item);
    const key = cleaned.toLowerCase();

    if (!cleaned || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleaned);
  }

  return normalized;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cardKey(word: string, reading: string) {
  return `${word.trim()}\u0000${reading.trim()}`;
}
