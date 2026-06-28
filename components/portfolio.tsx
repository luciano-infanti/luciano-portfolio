import type { CSSProperties } from "react";
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

  return (
    <div className="media-stack">
      {rows.map((row, index) => (
        <MediaRowView key={index} priority={index === 0} row={row} />
      ))}
    </div>
  );
}

function MediaRowView({ row, priority }: { row: MediaRow; priority: boolean }) {
  if (row.type === "grid") {
    return (
      <div className={row.items.length === 1 ? "media-grid media-grid-single" : "media-grid"}>
        {row.items.map((item, index) => (
          <MediaFrame item={item} key={item.src} priority={priority && index === 0} sizes={halfBleedSizes} />
        ))}
      </div>
    );
  }

  return <MediaFrame item={row.item} priority={priority} sizes={fullBleedSizes} />;
}

function MediaFrame({
  item,
  priority = false,
  sizes,
}: {
  item: WorkMedia;
  priority?: boolean;
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
