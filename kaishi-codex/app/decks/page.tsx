"use client";

import { useEffect, useState } from "react";
import { Database, Download, FileJson, Layers3, Plus } from "lucide-react";
import { db, ensureDeck, ensureDefaultDeck } from "@/lib/db";
import type { Card, Deck } from "@/lib/types";

type ImportEntry = {
  word?: unknown;
  reading?: unknown;
  meaning?: unknown;
  meanings?: unknown;
  jlpt?: unknown;
  jlptLevel?: unknown;
  partOfSpeech?: unknown;
};

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [name, setName] = useState("");
  const [importName, setImportName] = useState("Kaishi Import");
  const [importJson, setImportJson] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    await ensureDefaultDeck();
    const [nextDecks, nextCards] = await Promise.all([db.decks.toArray(), db.cards.toArray()]);
    setDecks(nextDecks);
    setCards(nextCards);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDeck() {
    const trimmed = name.trim();

    if (!trimmed) {
      return;
    }

    await ensureDeck(trimmed);
    setName("");
    await load();
  }

  async function seedDeck() {
    setStatus("Preparing the Default deck.");
    await ensureDefaultDeck();
    await load();
    setStatus("Default deck is ready.");
  }

  async function importDeck() {
    const parsed = parseImportedEntries(importJson);

    if (!parsed.entries.length) {
      setStatus(parsed.error ?? "No importable cards found.");
      return;
    }

    const deckId = await ensureDeck(importName.trim() || "Kaishi Import");
    const existingCards = await db.cards.where("deckId").equals(deckId).toArray();
    const knownKeys = new Set(existingCards.map((card) => cardKey(card.word, card.reading)));
    const inputKeys = new Set<string>();
    const now = Date.now();
    const newCards: Card[] = [];
    let skipped = parsed.skipped;

    for (const entry of parsed.entries) {
      const key = cardKey(entry.word, entry.reading);

      if (knownKeys.has(key) || inputKeys.has(key)) {
        skipped += 1;
        continue;
      }

      inputKeys.add(key);
      newCards.push({
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

    if (newCards.length) {
      await db.cards.bulkAdd(newCards);
    }

    setImportJson("");
    await load();
    setStatus(`Imported ${newCards.length} cards. Skipped ${skipped}.`);
  }

  return (
    <main className="kaishi-page">
      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="kaishi-panel p-4">
          <p className="kaishi-meta uppercase">Decks</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">Local collections</h1>

          <div className="mt-5 flex gap-2">
            <input
              className="kaishi-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New deck name"
            />
            <button className="kaishi-button kaishi-button-primary shrink-0" onClick={createDeck}>
              <Plus size={16} />
              Create
            </button>
          </div>

          <button className="kaishi-button mt-3 w-full justify-center" onClick={seedDeck}>
            <Download size={16} />
            Prepare Default Deck
          </button>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <p className="kaishi-meta uppercase">Import JSON</p>
            <input
              className="kaishi-input mt-2"
              value={importName}
              onChange={(event) => setImportName(event.target.value)}
              placeholder="Deck name"
            />
            <textarea
              className="kaishi-input mt-2 min-h-44 resize-y font-[var(--font-geist-mono)] text-xs"
              value={importJson}
              onChange={(event) => setImportJson(event.target.value)}
              placeholder='[{"word":"学校","reading":"がっこう","meanings":["school"],"jlpt":"N5"}]'
              spellCheck={false}
            />
            <button
              className="kaishi-button kaishi-button-primary mt-3 w-full justify-center"
              onClick={importDeck}
              disabled={!importJson.trim()}
            >
              <FileJson size={16} />
              Import JSON
            </button>
          </div>

          {status ? <p className="kaishi-meta mt-3">{status}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {decks.map((deck) => {
            const count = cards.filter((card) => card.deckId === deck.id).length;

            return (
              <article key={deck.id} className="kaishi-panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-zinc-100">{deck.name}</p>
                    <p className="kaishi-meta mt-1">{count} cards</p>
                  </div>
                  <div className="grid size-9 place-items-center rounded-md border border-[var(--line)] text-amber-300">
                    <Layers3 size={16} />
                  </div>
                </div>
              </article>
            );
          })}

          {!decks.length ? (
            <div className="kaishi-panel grid min-h-44 place-items-center p-4 text-center text-zinc-500 md:col-span-2">
              <div>
                <Database size={18} className="mx-auto mb-2 text-zinc-600" />
                <p>Create your first deck or save a card from Quick Add.</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function parseImportedEntries(json: string) {
  let raw: unknown;

  try {
    raw = JSON.parse(json);
  } catch {
    return { entries: [] as NormalizedEntry[], skipped: 0, error: "Invalid JSON." };
  }

  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && "cards" in raw && Array.isArray(raw.cards)
      ? raw.cards
      : [];
  const entries: NormalizedEntry[] = [];
  let skipped = 0;

  for (const item of items as ImportEntry[]) {
    const entry = normalizeEntry(item);

    if (entry) {
      entries.push(entry);
    } else {
      skipped += 1;
    }
  }

  return { entries, skipped };
}

type NormalizedEntry = {
  word: string;
  reading: string;
  meaning: string;
  jlptLevel?: string;
  partOfSpeech: string[];
};

function normalizeEntry(entry: ImportEntry): NormalizedEntry | null {
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
