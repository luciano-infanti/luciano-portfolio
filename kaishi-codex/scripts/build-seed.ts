import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { flattenJishoResults } from "../lib/jisho";

const TARGET_SIZE = 1500;
const OUT_FILE = path.join(process.cwd(), "public", "data", "kaishi_1500.json");
const SEARCHES = [
  { keyword: "#jlpt-n5", pages: 35 },
  { keyword: "#jlpt-n4", pages: 45 },
  { keyword: "#jlpt-n3", pages: 45 },
  { keyword: "#jlpt-n2", pages: 45 },
  { keyword: "#jlpt-n1", pages: 35 },
  { keyword: "#common", pages: 35 },
];
const PAGE_BATCH_SIZE = 8;

type JishoResponse = {
  data?: unknown[];
};

async function searchJisho(keyword: string, page: number) {
  const url = new URL("https://jisho.org/api/v1/search/words");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page", String(page));

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Jisho failed for ${keyword} page ${page}: ${response.status}`);
  }

  const payload = (await response.json()) as JishoResponse;
  return flattenJishoResults(payload.data as Parameters<typeof flattenJishoResults>[0], Number.POSITIVE_INFINITY);
}

async function main() {
  const seen = new Set<string>();
  const entries = [];

  for (const search of SEARCHES) {
    for (let startPage = 1; startPage <= search.pages && entries.length < TARGET_SIZE; startPage += PAGE_BATCH_SIZE) {
      const pages = Array.from(
        { length: Math.min(PAGE_BATCH_SIZE, search.pages - startPage + 1) },
        (_, index) => startPage + index,
      );
      const batch = await Promise.allSettled(pages.map((page) => searchJisho(search.keyword, page)));
      const results = batch.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

      if (!results.length) {
        continue;
      }

      for (const result of results) {
        const key = `${result.word}\u0000${result.reading}`;

        if (!result.word || !result.reading || !result.englishDefinitions.length || seen.has(key)) {
          continue;
        }

        seen.add(key);
        entries.push({
          word: result.word,
          reading: result.reading,
          meaning: result.englishDefinitions.join("; "),
          jlptLevel: result.jlptLevel,
          partOfSpeech: result.partOfSpeech,
        });

        if (entries.length >= TARGET_SIZE) {
          break;
        }
      }
    }
  }

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(`${OUT_FILE}`, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`Wrote ${entries.length} entries to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
