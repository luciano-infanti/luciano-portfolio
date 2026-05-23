import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  word: z.string().min(1),
  reading: z.string().min(1),
  meaning: z.string().optional(),
});

const mnemonicSchema = z.object({
  mnemonic: z.string().min(1),
  sentence: z.string().min(1),
  translation: z.string().min(1),
});

type GeminiPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: GeminiPart[];
    };
  }[];
};

function extractJson(text: string) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("The model did not return JSON.");
    }

    return JSON.parse(match[0]);
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected { word, reading }." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const { word, reading, meaning } = parsed.data;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const prompt = [
    `Japanese word: ${word}`,
    `Reading: ${reading}`,
    meaning ? `Dictionary hint: ${meaning}` : null,
    "",
    "Create a concise English mnemonic that helps a beginner remember the word.",
    "Create one natural Japanese phrase or short sentence using the word.",
    "Translate that phrase into English.",
    "Keep the Japanese phrase JLPT-appropriate when possible.",
    'Return only JSON: { "mnemonic": "...", "sentence": "...", "translation": "..." }',
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: "You are a Japanese tutor for SRS flashcards. Prefer memorable but accurate mnemonics and natural beginner-friendly Japanese.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text();

    return NextResponse.json(
      { error: "Mnemonic generation failed.", details },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim();

  if (!text) {
    return NextResponse.json(
      { error: "Mnemonic generation returned an empty response." },
      { status: 502 },
    );
  }

  const validated = mnemonicSchema.safeParse(extractJson(text));

  if (!validated.success) {
    return NextResponse.json(
      { error: "Mnemonic generation returned invalid JSON." },
      { status: 502 },
    );
  }

  return NextResponse.json(validated.data);
}
