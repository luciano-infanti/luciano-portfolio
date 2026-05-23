import { NextResponse } from "next/server";
import { flattenJishoResults } from "@/lib/jisho";

type JishoResponse = {
  data?: unknown[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("q")?.trim();

  if (!keyword) {
    return NextResponse.json({ results: [] });
  }

  const response = await fetch(
    `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Jisho search failed", results: [] },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as JishoResponse;
  const results = flattenJishoResults((payload.data ?? []) as Parameters<typeof flattenJishoResults>[0]);

  return NextResponse.json({ results });
}
