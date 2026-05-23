import type { JishoResult } from "@/lib/types";

type JishoJapanese = {
  word?: string;
  reading?: string;
};

type JishoSense = {
  english_definitions?: string[];
  parts_of_speech?: string[];
};

type JishoApiResult = {
  slug?: string;
  is_common?: boolean;
  jlpt?: string[];
  japanese?: JishoJapanese[];
  senses?: JishoSense[];
};

const unique = <T,>(items: T[]) => [...new Set(items)];

export function flattenJishoResults(results: JishoApiResult[], limit = 8): JishoResult[] {
  return results.slice(0, limit).map((entry) => {
    const japanese = entry.japanese ?? [];
    const primary = japanese.find((item) => item.word) ?? japanese[0] ?? {};
    const word = primary.word ?? primary.reading ?? entry.slug ?? "";
    const reading = primary.reading ?? japanese.find((item) => item.reading)?.reading ?? word;
    const senses = entry.senses ?? [];
    const englishDefinitions = unique(
      senses.flatMap((sense) => sense.english_definitions ?? []),
    ).slice(0, 6);
    const partOfSpeech = unique(
      senses.flatMap((sense) => sense.parts_of_speech ?? []),
    ).slice(0, 5);

    return {
      slug: entry.slug ?? word,
      word,
      reading,
      furigana: reading,
      englishDefinitions,
      jlptLevel: entry.jlpt?.[0]?.replace("jlpt-", "").toUpperCase(),
      partOfSpeech,
    };
  });
}
