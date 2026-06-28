"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { BlurImage } from "@/components/blur-image";
import type { Project, WorkMedia } from "@/lib/work";

const fullBleedSizes = "(max-width: 900px) calc(100vw - 32px), calc(100vw - 48px)";
const halfBleedSizes = "(max-width: 900px) calc(100vw - 32px), calc((100vw - 72px) / 2)";

type MediaRow =
  | {
      type: "single";
      item: WorkMedia;
    }
  | {
      type: "grid";
      items: WorkMedia[];
    };

type ProjectRowProps = Pick<Project, "name" | "whatIDid" | "company" | "year">;

export function ProjectRow({ name, whatIDid, company, year }: ProjectRowProps) {
  return (
    <div className="project-row">
      <span>{name}</span>
      <span>{whatIDid}</span>
      <span>{company}</span>
      <span className="project-year">{year}</span>
    </div>
  );
}

export function ProjectSection({ project }: { project: Project }) {
  return (
    <section className="project-section" id={project.slug}>
      <ProjectRow
        name={project.name}
        whatIDid={project.whatIDid}
        company={project.company}
        year={project.year}
      />
      <MediaStack media={project.media} />
    </section>
  );
}

export function MediaStack({ media }: { media: WorkMedia[] }) {
  const rows = getMediaRows(media);
  const loadedCount = useProgressiveLoad(media.length);

  let cursor = 0;

  return (
    <div className="media-stack">
      {rows.map((row, index) => {
        const startIndex = cursor;
        cursor += row.type === "grid" ? row.items.length : 1;

        return (
          <MediaRowView
            key={index}
            loadedCount={loadedCount}
            priority={index === 0}
            row={row}
            startIndex={startIndex}
          />
        );
      })}
    </div>
  );
}

// Progressively warm images top-to-bottom AFTER the page has loaded, so they're
// already fetched by the time the user scrolls to them. Gentle by design: one
// image at a time, during browser idle, and skipped entirely on data-saver or
// slow (2g) connections so we never punish constrained users.
function useProgressiveLoad(total: number) {
  const [loadedCount, setLoadedCount] = useState(1); // first image is priority anyway

  useEffect(() => {
    const connection = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "")) {
      return;
    }

    let cancelled = false;
    let index = 1;

    const advance = () => {
      if (cancelled || index >= total) return;
      index += 1;
      setLoadedCount(index);
      schedule();
    };

    const schedule = () => {
      const idle =
        window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
      idle(() => window.setTimeout(advance, 120));
    };

    const start = () => schedule();

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, [total]);

  return loadedCount;
}

function MediaRowView({
  row,
  priority,
  startIndex,
  loadedCount,
}: {
  row: MediaRow;
  priority: boolean;
  startIndex: number;
  loadedCount: number;
}) {
  if (row.type === "grid") {
    return (
      <div className={row.items.length === 1 ? "media-grid media-grid-single" : "media-grid"}>
        {row.items.map((item, index) => (
          <MediaFrame
            eager={startIndex + index < loadedCount}
            item={item}
            key={item.src}
            priority={priority && index === 0}
            sizes={halfBleedSizes}
          />
        ))}
      </div>
    );
  }

  return (
    <MediaFrame
      eager={startIndex < loadedCount}
      item={row.item}
      priority={priority}
      sizes={fullBleedSizes}
    />
  );
}

function MediaFrame({
  item,
  priority = false,
  eager = false,
  sizes,
}: {
  item: WorkMedia;
  priority?: boolean;
  eager?: boolean;
  sizes: string;
}) {
  const style = {
    aspectRatio: `${item.width} / ${item.height}`,
  } satisfies CSSProperties;

  return (
    <figure className="media-frame" style={style}>
      {item.kind === "image" ? (
        <BlurImage
          alt={item.alt}
          blurDataURL={item.blurDataURL}
          className="media-image"
          fill
          // Priority loads immediately; otherwise the progressive cursor flips
          // images to eager top-to-bottom, falling back to native lazy until then.
          loading={priority ? undefined : eager ? "eager" : "lazy"}
          priority={priority}
          quality={90}
          sizes={sizes}
          src={item.src}
        />
      ) : (
        <video
          aria-label={item.alt}
          autoPlay
          className="media-video"
          loop
          muted
          playsInline
          preload="metadata"
          src={item.src}
        />
      )}
    </figure>
  );
}

function getMediaRows(media: WorkMedia[]) {
  const rows: MediaRow[] = [];
  let index = 0;

  while (index < media.length) {
    const item = media[index];

    if (isWide(item)) {
      rows.push({ type: "single", item });
      index += 1;
      continue;
    }

    const next = media[index + 1];

    if (next && !isWide(next)) {
      rows.push({ type: "grid", items: [item, next] });
      index += 2;
      continue;
    }

    rows.push({ type: "grid", items: [item] });
    index += 1;
  }

  return rows;
}

function isWide(item: WorkMedia) {
  return item.width / item.height >= 1.15;
}
