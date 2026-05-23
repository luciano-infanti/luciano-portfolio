"use client";

import { type ReactNode } from "react";
import { BookOpenText, Loader2, Network, Sparkles } from "lucide-react";
import type { WordEnrichment } from "@/lib/types";

export function EnrichmentPanel({
  enrichment,
  isLoading,
}: {
  enrichment: WordEnrichment | null;
  isLoading: boolean;
}) {
  const hasContent =
    Boolean(enrichment?.kanji.length) ||
    Boolean(enrichment?.sentences.length) ||
    Boolean(enrichment?.relatedWords.length) ||
    Boolean(enrichment?.notices.length);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-t border-[var(--line)] pt-4 text-sm text-zinc-400">
        <Loader2 size={15} className="animate-spin" />
        Enriching dictionary details
      </div>
    );
  }

  if (!enrichment || !hasContent) {
    return null;
  }

  return (
    <div className="grid gap-5 border-t border-[var(--line)] pt-4">
      {enrichment.kanji.length ? (
        <section>
          <SectionLabel icon={<Sparkles size={14} />} label="Kanji Breakdown" />
          <div className="mt-3 grid gap-3">
            {enrichment.kanji.map((item) => (
              <div
                key={item.kanji}
                className="grid gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0 sm:grid-cols-[72px_1fr]"
              >
                <div>
                  <p className="kaishi-kana text-5xl leading-none text-amber-100">{item.kanji}</p>
                  <p className="kaishi-meta mt-1">
                    {item.strokeCount ? `${item.strokeCount} strokes` : "Strokes -"}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-zinc-300">
                  <p>{formatList(item.meanings, "Meaning unavailable")}</p>
                  <ReadingLine label="On" values={item.onReadings} />
                  <ReadingLine label="Kun" values={item.kunReadings} />
                  <p className="kaishi-meta">
                    {[
                      item.jlpt ? `JLPT N${item.jlpt}` : null,
                      item.grade ? `Grade ${item.grade}` : null,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "Level data unavailable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {enrichment.sentences.length ? (
        <section>
          <SectionLabel icon={<BookOpenText size={14} />} label="Example Sentences" />
          <div className="mt-3 grid gap-3">
            {enrichment.sentences.map((sentence) => (
              <div key={sentence.japanese} className="border-b border-[var(--line)] pb-3 last:border-0 last:pb-0">
                <p className="kaishi-kana text-zinc-100">{sentence.japanese}</p>
                <p className="mt-1 text-sm text-zinc-400">{sentence.english}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {enrichment.relatedWords.length ? (
        <section>
          <SectionLabel icon={<Network size={14} />} label="Words With Shared Kanji" />
          <div className="mt-3 grid gap-2">
            {enrichment.relatedWords.map((word) => (
              <div
                key={`${word.word}-${word.reading}`}
                className="grid gap-1 border-b border-[var(--line)] py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="kaishi-kana text-lg text-zinc-100">{word.word}</p>
                  <p className="kaishi-meta">{word.reading || "Reading -"}</p>
                  <span className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-zinc-500">
                    {word.sharedKanji}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{formatList(word.meanings, "Meaning unavailable")}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {enrichment.notices.length ? (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/80">
          {enrichment.notices.join(" ")}
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {icon}
      {label}
    </div>
  );
}

function ReadingLine({ label, values }: { label: string; values: string[] }) {
  if (!values.length) {
    return null;
  }

  return (
    <p>
      <span className="kaishi-meta mr-2">{label}</span>
      <span className="kaishi-kana">{values.slice(0, 8).join("、")}</span>
    </p>
  );
}

function formatList(values: string[], fallback: string) {
  return values.length ? values.slice(0, 5).join(", ") : fallback;
}
