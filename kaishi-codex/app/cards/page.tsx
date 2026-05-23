"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Save, Search, Trash2, X } from "lucide-react";
import { db, ensureDefaultDeck } from "@/lib/db";
import type { Card, ReviewLog } from "@/lib/types";

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Card | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    await ensureDefaultDeck();
    const [nextCards, nextLogs] = await Promise.all([
      db.cards.orderBy("createdAt").reverse().toArray(),
      db.reviewLogs.toArray(),
    ]);
    setCards(nextCards);
    setLogs(nextLogs);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return cards;
    }

    return cards.filter((card) =>
      [card.word, card.reading, card.meaning, card.mnemonic ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [cards, query]);

  const retention = useMemo(() => {
    if (!logs.length) {
      return "0%";
    }

    const kept = logs.filter((log) => log.quality > 1).length;
    return `${Math.round((kept / logs.length) * 100)}%`;
  }, [logs]);

  const todayVolume = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return logs.filter((log) => log.reviewedAt >= today.getTime()).length;
  }, [logs]);

  async function deleteCard(card: Card) {
    if (!card.id) {
      return;
    }

    await db.cards.delete(card.id);
    await load();
    setStatus(`${card.word} deleted.`);
  }

  async function toggleSuspended(card: Card) {
    if (!card.id) {
      return;
    }

    await db.cards.update(card.id, {
      suspended: !card.suspended,
      updatedAt: Date.now(),
    });
    await load();
  }

  async function saveEdit() {
    if (!editing?.id) {
      return;
    }

    await db.cards.put({
      ...editing,
      updatedAt: Date.now(),
    });
    setEditing(null);
    await load();
    setStatus("Card updated.");
  }

  return (
    <main className="kaishi-page">
      <section className="mb-4 grid gap-4 md:grid-cols-3">
        <Metric label="Cards" value={`${cards.length}`} />
        <Metric label="Retention" value={retention} />
        <Metric label="Daily Volume" value={`${todayVolume}`} />
      </section>

      <section className="kaishi-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4">
          <div>
            <p className="kaishi-meta uppercase">Card Browser</p>
            <h1 className="mt-1 text-xl font-semibold text-zinc-100">Search, edit, suspend, delete</h1>
          </div>
          <label className="flex min-w-[260px] items-center gap-2">
            <Search size={16} className="text-zinc-500" />
            <input
              className="kaishi-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="kaishi-table min-w-[860px]">
            <thead>
              <tr>
                <th className="w-[18%]">Word</th>
                <th className="w-[18%]">Reading</th>
                <th>Meaning</th>
                <th className="w-[12%]">Due</th>
                <th className="w-[11%]">Suspended</th>
                <th className="w-[16%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => (
                <tr key={card.id}>
                  <td className="kaishi-kana text-zinc-100">{card.word}</td>
                  <td className="kaishi-kana text-zinc-300">{card.reading}</td>
                  <td>{card.meaning}</td>
                  <td>{formatDate(card.dueDate)}</td>
                  <td>
                    <button className="kaishi-button min-h-8 px-2" onClick={() => toggleSuspended(card)}>
                      {card.suspended ? <X size={14} /> : <Check size={14} />}
                      {card.suspended ? "Yes" : "No"}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="kaishi-button min-h-8 px-2" onClick={() => setEditing(card)}>
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button className="kaishi-button min-h-8 px-2 text-red-300" onClick={() => deleteCard(card)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length ? <p className="p-4 text-zinc-500">No cards match this search.</p> : null}
      </section>

      {editing ? (
        <section className="kaishi-panel mt-4 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="kaishi-meta uppercase">Edit Card</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-100">{editing.word}</h2>
            </div>
            <button className="kaishi-button" onClick={() => setEditing(null)}>
              <X size={16} />
              Close
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <EditField label="Word" value={editing.word} onChange={(word) => setEditing({ ...editing, word })} />
            <EditField
              label="Reading"
              value={editing.reading}
              onChange={(reading) => setEditing({ ...editing, reading })}
            />
            <EditField
              label="Meaning"
              value={editing.meaning}
              onChange={(meaning) => setEditing({ ...editing, meaning })}
            />
            <EditField
              label="Mnemonic"
              value={editing.mnemonic ?? ""}
              onChange={(mnemonic) => setEditing({ ...editing, mnemonic })}
            />
            <EditField
              label="Phrase"
              value={editing.sentence ?? ""}
              onChange={(sentence) => setEditing({ ...editing, sentence })}
            />
            <EditField
              label="Translation"
              value={editing.translation ?? ""}
              onChange={(translation) => setEditing({ ...editing, translation })}
            />
          </div>

          <button className="kaishi-button kaishi-button-primary mt-4" onClick={saveEdit}>
            <Save size={16} />
            Save Changes
          </button>
        </section>
      ) : null}

      {status ? <p className="kaishi-meta mt-3">{status}</p> : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="kaishi-panel p-4">
      <p className="kaishi-meta uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="kaishi-meta uppercase">{label}</span>
      <input className="kaishi-input mt-1" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}
