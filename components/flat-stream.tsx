import { MediaStack } from "@/components/portfolio";
import type { Project } from "@/lib/work";

/**
 * Renders every image from every project as one continuous stream.
 *
 * - No project titles / dividers.
 * - Folder + filename order from `lib/work.ts` is preserved (sorted by year,
 *   then `order`, then `slug`, then filename within each folder).
 * - Aspect-ratio pairing in `MediaStack` still applies, so vertical pairs sit
 *   side-by-side and wide images go full-bleed.
 */
export function FlatStream({ projects }: { projects: Project[] }) {
  const media = projects.flatMap((project) => project.media);

  return (
    <section className="flat-stream" aria-label="Selected work">
      <MediaStack media={media} />
    </section>
  );
}
