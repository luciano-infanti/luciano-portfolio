"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Keyboard, Plus } from "lucide-react";
import { EnrichmentPanel } from "@/components/kaishi/enrichment-panel";
import { db, ensureDefaultDeck } from "@/lib/db";
import { isDue, qualityLabel, scheduleNextReview } from "@/lib/srs";
import type { Card, ReviewQuality, WordEnrichment } from "@/lib/types";

const grades: ReviewQuality[] = [1, 2, 3, 4];

export default function StudyPage() {
  const [queue, setQueue] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enrichment, setEnrichment] = useState<WordEnrichment | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  const current = queue[0];

  async function loadDueCards() {
    await ensureDefaultDeck();
    const cards = (await db.cards.toArray())
      .filter((card) => isDue(card))
      .sort((a, b) => a.dueDate - b.dueDate);

    setQueue(cards);
    setLoaded(true);
  }

  useEffect(() => {
    loadDueCards();
  }, []);

  useEffect(() => {
    if (!current) {
      setEnrichment(null);
      setIsEnriching(false);
      return;
    }

    const controller = new AbortController();

    setIsEnriching(true);
    setEnrichment(null);

    fetch(`/api/enrich?word=${encodeURIComponent(current.word)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as WordEnrichment & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Enrichment lookup failed.");
        }

        setEnrichment(payload);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEnrichment({
            kanji: [],
            relatedWords: [],
            sentences: [],
            notices: ["Extra dictionary details are temporarily unavailable."],
          });
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsEnriching(false);
        }
      });

    return () => controller.abort();
  }, [current]);

  async function gradeCard(quality: ReviewQuality) {
    if (!current?.id || !flipped) {
      return;
    }

    const next = scheduleNextReview(current, quality);
    await db.cards.put(next);
    await db.reviewLogs.add({
      cardId: current.id,
      reviewedAt: next.lastReviewedAt ?? Date.now(),
      quality,
    });

    setQueue((cards) => cards.slice(1));
    setFlipped(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }

      if (grades.includes(Number(event.key) as ReviewQuality)) {
        event.preventDefault();
        gradeCard(Number(event.key) as ReviewQuality);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, flipped]);

  const progress = useMemo(() => {
    if (!loaded) {
      return "Loading";
    }

    return `${queue.length} due`;
  }, [loaded, queue.length]);

  return (
    <main className="kaishi-page">
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kaishi-meta uppercase">Study</p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">{progress}</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Keyboard size={15} />
          Space flip | 1 Again | 2 Hard | 3 Good | 4 Easy
        </div>
      </section>

      {current ? (
        <div className="grid min-h-[620px] gap-4 lg:grid-cols-[1fr_320px]">
          <button
            className="kaishi-panel min-h-[520px] overflow-hidden p-0 text-center"
            onClick={() => setFlipped((value) => !value)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.id}-${flipped ? "back" : "front"}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`w-full p-6 ${
                  flipped ? "max-h-[72vh] overflow-auto" : "grid min-h-[520px] place-items-center"
                }`}
              >
                {!flipped ? (
                  <div>
                    <p className="kaishi-kana text-[clamp(3.75rem,10vw,9rem)] font-semibold leading-none text-zinc-100">
                      {current.word}
                    </p>
                    <p className="kaishi-kana mt-5 text-lg text-zinc-500">{current.reading}</p>
                  </div>
                ) : (
                  <div className="mx-auto grid max-w-2xl gap-6 text-left">
                    <StudyField label="Mnemonic" value={current.mnemonic ?? "No mnemonic saved."} amber />
                    <StudyField label="Phrase" value={current.sentence ?? "No phrase saved."} kana />
                    <StudyField label="Translation" value={current.translation ?? "No translation saved."} />
                    <EnrichmentPanel enrichment={enrichment} isLoading={isEnriching} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </button>

          <aside className="kaishi-panel flex flex-col p-4">
            <div>
              <p className="kaishi-meta uppercase">Card Meta</p>
              <dl className="mt-3 grid gap-3 text-sm">
                <Meta label="Interval" value={`${current.interval} days`} />
                <Meta label="EF" value={current.easinessFactor.toFixed(2)} />
                <Meta label="Reps" value={`${current.repetitionCount}`} />
                <Meta label="JLPT" value={current.jlptLevel ?? "-"} />
              </dl>
            </div>

            <div className="mt-auto grid gap-2 pt-4">
              {grades.map((quality) => (
                <button
                  key={quality}
                  className={`kaishi-button justify-between ${quality === 4 ? "kaishi-button-primary" : ""}`}
                  onClick={() => gradeCard(quality)}
                  disabled={!flipped}
                >
                  <span>{quality}</span>
                  <span>{qualityLabel(quality)}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div className="kaishi-panel grid min-h-[520px] place-items-center p-6 text-center">
          <div>
            <p className="text-2xl font-semibold text-zinc-100">
              {loaded ? "Queue clear." : "Loading queue."}
            </p>
            <p className="kaishi-meta mt-2">
              {loaded
                ? "Add a card or wait until the next due date."
                : "Checking your browser database."}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/add" className="kaishi-button">
                <Plus size={16} />
                Add Card
              </Link>
              <Link href="/cards" className="kaishi-button kaishi-button-primary">
                Browser
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StudyField({
  label,
  value,
  amber,
  kana,
}: {
  label: string;
  value: string;
  amber?: boolean;
  kana?: boolean;
}) {
  return (
    <div>
      <p className="kaishi-meta uppercase">{label}</p>
      <p className={`mt-1 text-lg ${amber ? "text-amber-200" : "text-zinc-100"} ${kana ? "kaishi-kana" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--line)] pb-2">
      <dt className="kaishi-meta">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}
