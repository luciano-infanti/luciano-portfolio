"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Database, Flame, Plus } from "lucide-react";
import { db, ensureDefaultDeck } from "@/lib/db";
import type { Card, ReviewLog } from "@/lib/types";
import { isDue } from "@/lib/srs";

type DashboardStats = {
  cards: Card[];
  logs: ReviewLog[];
  dueCount: number;
  deckCount: number;
};

const emptyStats: DashboardStats = {
  cards: [],
  logs: [],
  dueCount: 0,
  deckCount: 0,
};

function retention(logs: ReviewLog[]) {
  if (!logs.length) {
    return "0%";
  }

  const kept = logs.filter((log) => log.quality > 1).length;
  return `${Math.round((kept / logs.length) * 100)}%`;
}

function todayVolume(logs: ReviewLog[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return logs.filter((log) => log.reviewedAt >= today.getTime()).length;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);

  useEffect(() => {
    let alive = true;

    async function load() {
      await ensureDefaultDeck();
      const [cards, decks, logs] = await Promise.all([
        db.cards.toArray(),
        db.decks.toArray(),
        db.reviewLogs.toArray(),
      ]);

      if (!alive) {
        return;
      }

      setStats({
        cards,
        logs,
        deckCount: decks.length,
        dueCount: cards.filter((card) => isDue(card)).length,
      });
    }

    load();
    const interval = window.setInterval(load, 4000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, []);

  const nextDue = useMemo(() => {
    const future = stats.cards
      .filter((card) => !card.suspended && card.dueDate > Date.now())
      .sort((a, b) => a.dueDate - b.dueDate)[0];

    if (!future) {
      return "No future reviews";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(future.dueDate);
  }, [stats.cards]);

  return (
    <main className="kaishi-page">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="kaishi-panel p-5 sm:p-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="kaishi-meta uppercase">Due Today</p>
              <h1 className="mt-2 text-7xl font-semibold leading-none tracking-normal text-zinc-100 sm:text-8xl">
                {stats.dueCount}
              </h1>
            </div>
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Local IndexedDB
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/study" className="kaishi-button kaishi-button-primary">
              <BookOpen size={16} />
              Start Study
              <ArrowRight size={15} />
            </Link>
            <Link href="/add" className="kaishi-button">
              <Plus size={16} />
              Quick Add
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Stat icon={Flame} label="Retention" value={retention(stats.logs)} />
          <Stat icon={Clock} label="Daily Volume" value={`${todayVolume(stats.logs)}`} />
          <Stat icon={Database} label="Cards / Decks" value={`${stats.cards.length} / ${stats.deckCount}`} />
        </div>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="kaishi-panel p-4">
          <p className="kaishi-meta uppercase">Next Due</p>
          <p className="mt-2 text-lg text-zinc-100">{nextDue}</p>
        </div>
        <div className="kaishi-panel p-4">
          <p className="kaishi-meta uppercase">Study Flow</p>
          <p className="mt-2 text-sm text-zinc-300">
            Space flips the card. 1-4 grades it. The queue is ready for a full
            keyboard session.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="kaishi-panel flex items-center justify-between gap-3 p-4">
      <div>
        <p className="kaishi-meta uppercase">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
      </div>
      <div className="grid size-9 place-items-center rounded-md border border-[var(--line)] text-amber-300">
        <Icon size={16} />
      </div>
    </div>
  );
}
