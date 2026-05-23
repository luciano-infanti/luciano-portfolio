"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Loader2, Plus, Search } from "lucide-react";
import { EnrichmentPanel } from "@/components/kaishi/enrichment-panel";
import { db, ensureDefaultDeck } from "@/lib/db";
import type { JishoResult, MnemonicResponse, WordEnrichment } from "@/lib/types";

export default function AddPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<JishoResult[]>([]);
  const [selected, setSelected] = useState<JishoResult | null>(null);
  const [mnemonic, setMnemonic] = useState<MnemonicResponse | null>(null);
  const [enrichment, setEnrichment] = useState<WordEnrichment | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setSelected(null);
      setMnemonic(null);
      setEnrichment(null);
      setStatus("");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setStatus("");

      try {
        const response = await fetch(`/api/jisho?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as { results?: JishoResult[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Search failed.");
        }

        const nextResults = payload.results ?? [];
        setResults(nextResults);
        setSelected(nextResults[0] ?? null);
        setMnemonic(null);
        setEnrichment(null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setStatus(error instanceof Error ? error.message : "Search failed.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    if (!selected) {
      setEnrichment(null);
      setIsEnriching(false);
      return;
    }

    const controller = new AbortController();

    setIsEnriching(true);
    setEnrichment(null);

    fetch(`/api/enrich?word=${encodeURIComponent(selected.word)}`, {
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
  }, [selected]);

  const meaning = useMemo(() => {
    if (!selected) {
      return "";
    }

    return selected.englishDefinitions.join("; ");
  }, [selected]);

  async function generateMnemonic() {
    if (!selected) {
      return;
    }

    setIsGenerating(true);
    setStatus("");

    try {
      const response = await fetch("/api/mnemonic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          word: selected.word,
          reading: selected.reading,
          meaning,
        }),
      });
      const payload = (await response.json()) as MnemonicResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setMnemonic(payload);
      setStatus("Mnemonic generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveCard() {
    if (!selected) {
      return;
    }

    const deckId = await ensureDefaultDeck();
    const now = Date.now();
    const exampleSentence = enrichment?.sentences[0];

    await db.cards.add({
      deckId,
      word: selected.word,
      reading: selected.reading,
      furigana: selected.furigana,
      meaning,
      partOfSpeech: selected.partOfSpeech,
      jlptLevel: selected.jlptLevel,
      mnemonic: mnemonic?.mnemonic,
      sentence: mnemonic?.sentence ?? exampleSentence?.japanese,
      translation: mnemonic?.translation ?? exampleSentence?.english,
      interval: 0,
      easinessFactor: 2.5,
      repetitionCount: 0,
      dueDate: now,
      suspended: false,
      createdAt: now,
      updatedAt: now,
    });

    setStatus(`${selected.word} saved to the study queue.`);
  }

  return (
    <main className="kaishi-page">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="kaishi-panel overflow-hidden">
          <div className="border-b border-[var(--line)] p-4">
            <label className="kaishi-meta uppercase" htmlFor="jisho-search">
              Quick Add
            </label>
            <div className="mt-2 flex items-center gap-2">
              <Search size={16} className="text-zinc-500" />
              <input
                ref={inputRef}
                id="jisho-search"
                className="kaishi-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="食べる"
              />
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto">
            {isSearching ? (
              <div className="flex items-center gap-2 p-4 text-zinc-400">
                <Loader2 size={15} className="animate-spin" />
                Searching Jisho
              </div>
            ) : results.length ? (
              results.map((result) => (
                <button
                  key={`${result.slug}-${result.reading}`}
                  className={`block w-full border-b border-[var(--line)] p-4 text-left transition-colors ${
                    selected?.slug === result.slug && selected?.reading === result.reading
                      ? "bg-amber-500/10"
                      : "hover:bg-zinc-800/40"
                  }`}
                  onClick={() => {
                    setSelected(result);
                    setMnemonic(null);
                    setEnrichment(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="kaishi-kana text-xl text-zinc-100">{result.word}</p>
                      <p className="kaishi-meta mt-1">{result.reading}</p>
                    </div>
                    <span className="kaishi-meta">{result.jlptLevel ?? "JLPT -"}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-300">
                    {result.englishDefinitions.join("; ")}
                  </p>
                </button>
              ))
            ) : (
              <div className="p-4 text-zinc-500">Type a Japanese word to search.</div>
            )}
          </div>
        </div>

        <aside className="kaishi-panel min-h-[460px] p-4">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
                <div>
                  <p className="kaishi-kana text-5xl leading-none text-zinc-100">{selected.word}</p>
                  <p className="kaishi-kana mt-2 text-zinc-400">{selected.reading}</p>
                </div>
                <span className="rounded border border-[var(--line)] px-2 py-1 text-xs text-zinc-400">
                  {selected.jlptLevel ?? "Unrated"}
                </span>
              </div>

              <div className="grid gap-4 py-4">
                <Field label="Meaning" value={meaning} />
                <Field label="Part of Speech" value={selected.partOfSpeech.join(", ") || "Unknown"} />
                {mnemonic ? (
                  <>
                    <Field label="Mnemonic" value={mnemonic.mnemonic} strong />
                    <Field label="Phrase" value={mnemonic.sentence} kana />
                    <Field label="Translation" value={mnemonic.translation} />
                  </>
                ) : null}
                <EnrichmentPanel enrichment={enrichment} isLoading={isEnriching} />
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                <button
                  className="kaishi-button"
                  onClick={generateMnemonic}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                  Generate Mnemonic + Phrase
                </button>
                <button className="kaishi-button kaishi-button-primary" onClick={saveCard}>
                  <Plus size={16} />
                  Save Card
                </button>
              </div>

              {status ? <p className="kaishi-meta mt-3">{status}</p> : null}
            </div>
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center text-center text-zinc-500">
              <div>
                <Check size={20} className="mx-auto mb-3 text-zinc-600" />
                <p>Select a search result to preview it.</p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  strong,
  kana,
}: {
  label: string;
  value: string;
  strong?: boolean;
  kana?: boolean;
}) {
  return (
    <div>
      <p className="kaishi-meta uppercase">{label}</p>
      <p className={`mt-1 ${strong ? "text-amber-200" : "text-zinc-200"} ${kana ? "kaishi-kana" : ""}`}>
        {value}
      </p>
    </div>
  );
}
