import { NextResponse } from "next/server";
import type { ExampleSentence, KanjiInsight, RelatedWord, WordEnrichment } from "@/lib/types";

type KanjiApiKanji = {
  kanji?: string;
  grade?: number;
  stroke_count?: number;
  meanings?: string[];
  kun_readings?: string[];
  on_readings?: string[];
  name_readings?: string[];
  jlpt?: number;
};

type KanjiApiWord = {
  variants?: {
    written?: string;
    pronounced?: string;
    priorities?: string[];
  }[];
  meanings?: {
    glosses?: string[];
  }[];
};

type TatoebaSentence = {
  lang?: string;
  text?: string;
  translations?: unknown;
};

type TatoebaResponse = {
  data?: TatoebaSentence[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim() ?? "";
  const kanjiChars = unique(Array.from(word).filter((character) => /\p{Script=Han}/u.test(character)));
  const notices: string[] = [];

  if (!word) {
    return NextResponse.json<WordEnrichment>({
      kanji: [],
      relatedWords: [],
      sentences: [],
      notices: ["No word provided."],
    });
  }

  const [kanjiResults, relatedResults, sentenceResults] = await Promise.all([
    Promise.allSettled(kanjiChars.map(loadKanjiInsight)),
    Promise.allSettled(kanjiChars.map((character) => loadRelatedWords(character, word))),
    loadExampleSentences(word).catch(() => {
      notices.push("Example sentence lookup is temporarily unavailable.");
      return [];
    }),
  ]);

  const kanji = kanjiResults
    .flatMap((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        return [result.value];
      }

      notices.push(`Kanji details unavailable for ${kanjiChars[index]}.`);
      return [];
    })
    .slice(0, 6);
  const relatedWords = uniqueRelatedWords(
    relatedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  ).slice(0, 12);

  return NextResponse.json<WordEnrichment>({
    kanji,
    relatedWords,
    sentences: sentenceResults.slice(0, 3),
    notices,
  });
}

async function loadKanjiInsight(character: string): Promise<KanjiInsight | null> {
  const payload = await fetchJson<KanjiApiKanji>(
    `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(character)}`,
  );

  if (!payload?.kanji) {
    return null;
  }

  return {
    kanji: payload.kanji,
    meanings: payload.meanings ?? [],
    kunReadings: payload.kun_readings ?? [],
    onReadings: payload.on_readings ?? [],
    nameReadings: payload.name_readings ?? [],
    strokeCount: payload.stroke_count,
    jlpt: payload.jlpt,
    grade: payload.grade,
  };
}

async function loadRelatedWords(character: string, currentWord: string): Promise<RelatedWord[]> {
  const payload = await fetchJson<KanjiApiWord[]>(
    `https://kanjiapi.dev/v1/words/${encodeURIComponent(character)}`,
  );

  return (payload ?? [])
    .map((entry) => {
      const variant = entry.variants?.find((item) => item.written?.includes(character)) ?? entry.variants?.[0];
      const word = variant?.written?.trim() ?? "";
      const reading = variant?.pronounced?.trim() ?? "";
      const meanings = unique((entry.meanings ?? []).flatMap((meaning) => meaning.glosses ?? [])).slice(0, 3);

      if (!word || word === currentWord || !meanings.length) {
        return null;
      }

      return {
        word,
        reading,
        meanings,
        sharedKanji: character,
      };
    })
    .filter((entry): entry is RelatedWord => Boolean(entry))
    .sort((a, b) => scoreRelatedWord(a, character) - scoreRelatedWord(b, character));
}

async function loadExampleSentences(word: string): Promise<ExampleSentence[]> {
  const url = new URL("https://api.tatoeba.org/v1/sentences");
  url.searchParams.set("lang", "jpn");
  url.searchParams.set("q", word);
  url.searchParams.set("trans:lang", "eng");
  url.searchParams.set("trans:is_direct", "yes");
  url.searchParams.set("showtrans:lang", "eng");
  url.searchParams.set("showtrans:is_direct", "yes");
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("limit", "6");

  const payload = await fetchJson<TatoebaResponse>(url.toString());

  return uniqueSentences(
    (payload.data ?? []).flatMap((sentence) => {
      const japanese = sentence.text?.trim();
      const english = flattenTranslations(sentence.translations)
        .find((translation) => translation.lang === "eng")
        ?.text?.trim();

      if (!japanese || !english) {
        return [];
      }

      return [{ japanese, english, source: "tatoeba" as const }];
    }),
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "force-cache",
    next: { revalidate: 60 * 60 * 24 * 7 },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function flattenTranslations(value: unknown): TatoebaSentence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (Array.isArray(item)) {
      return flattenTranslations(item);
    }

    return item && typeof item === "object" ? [item as TatoebaSentence] : [];
  });
}

function scoreRelatedWord(word: RelatedWord, character: string) {
  const startsWithKanji = word.word.startsWith(character) ? 0 : 3;
  return startsWithKanji + word.word.length;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueRelatedWords(words: RelatedWord[]) {
  const seen = new Set<string>();
  const result: RelatedWord[] = [];

  for (const word of words) {
    const key = `${word.word}\u0000${word.reading}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(word);
    }
  }

  return result;
}

function uniqueSentences(sentences: ExampleSentence[]) {
  const seen = new Set<string>();
  const result: ExampleSentence[] = [];

  for (const sentence of sentences) {
    if (!seen.has(sentence.japanese)) {
      seen.add(sentence.japanese);
      result.push(sentence);
    }
  }

  return result;
}
