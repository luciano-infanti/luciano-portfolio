export type ReviewQuality = 1 | 2 | 3 | 4;

export type QualityLabel = "Again" | "Hard" | "Good" | "Easy";

export type Deck = {
  id?: number;
  name: string;
  createdAt: number;
  seedKey?: string;
  seededAt?: number;
  seedCount?: number;
};

export type Card = {
  id?: number;
  deckId: number;
  word: string;
  reading: string;
  furigana?: string;
  meaning: string;
  partOfSpeech: string[];
  jlptLevel?: string;
  mnemonic?: string;
  sentence?: string;
  translation?: string;
  interval: number;
  easinessFactor: number;
  repetitionCount: number;
  dueDate: number;
  suspended: boolean;
  createdAt: number;
  updatedAt: number;
  lastReviewedAt?: number;
};

export type ReviewLog = {
  id?: number;
  cardId: number;
  reviewedAt: number;
  quality: ReviewQuality;
};

export type JishoResult = {
  slug: string;
  word: string;
  reading: string;
  furigana: string;
  englishDefinitions: string[];
  jlptLevel?: string;
  partOfSpeech: string[];
};

export type MnemonicPayload = {
  word: string;
  reading: string;
  meaning: string;
};

export type MnemonicResponse = {
  mnemonic: string;
  sentence: string;
  translation: string;
};

export type KanjiInsight = {
  kanji: string;
  meanings: string[];
  kunReadings: string[];
  onReadings: string[];
  nameReadings: string[];
  strokeCount?: number;
  jlpt?: number;
  grade?: number;
};

export type RelatedWord = {
  word: string;
  reading: string;
  meanings: string[];
  sharedKanji: string;
};

export type ExampleSentence = {
  japanese: string;
  english: string;
  source: "tatoeba";
};

export type WordEnrichment = {
  kanji: KanjiInsight[];
  relatedWords: RelatedWord[];
  sentences: ExampleSentence[];
  notices: string[];
};
