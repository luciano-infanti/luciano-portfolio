import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  formatFilename,
  getImageDimensions,
  imageExtensions,
  isSupportedMedia,
} from "./media-utils";

export type WorkMedia = {
  kind: "image" | "video";
  src: string;
  filename: string;
  width: number;
  height: number;
  alt: string;
};

export type Project = {
  slug: string;
  name: string;
  whatIDid: string;
  company: string;
  year: string;
  order: number;
  media: WorkMedia[];
};

type ProjectJson = {
  order?: unknown;
  name?: unknown;
  whatIDid?: unknown;
  company?: unknown;
  year?: unknown;
};

const worksDirectory = path.join(process.cwd(), "public", "works");

export const profile = {
  bio: "Designer and code enthusiast with over 8 years of experience. I specialize in crafting interactive interfaces and thrive in diverse design explorations. My work bridges the gap between branding and product, and I also have a keen eye for motion, 3D and prototyping.",
};

export const projects = getProjects();

function getProjects() {
  if (!existsSync(worksDirectory)) {
    return [];
  }

  return readdirSync(worksDirectory)
    .filter((entry) => !entry.startsWith("."))
    .map((entry) => loadProject(entry))
    .filter((project): project is Project => project !== null)
    .sort((a, b) => a.order - b.order || getProjectYear(b.year) - getProjectYear(a.year) || a.slug.localeCompare(b.slug));
}

function loadProject(slug: string): Project | null {
  const projectDirectory = path.join(worksDirectory, slug);

  if (!statSync(projectDirectory).isDirectory()) {
    return null;
  }

  const jsonPath = path.join(projectDirectory, "project.json");

  if (!existsSync(jsonPath)) {
    console.warn(`[works] Skipping "${slug}": missing project.json`);
    return null;
  }

  try {
    const metadata = JSON.parse(readFileSync(jsonPath, "utf8")) as ProjectJson;
    const project = validateProjectJson(slug, metadata);

    if (!project) {
      return null;
    }

    return {
      ...project,
      slug,
      media: getProjectMedia(slug, projectDirectory, project.name),
    };
  } catch (error) {
    console.warn(`[works] Skipping "${slug}": invalid project.json`, error);
    return null;
  }
}

function validateProjectJson(slug: string, metadata: ProjectJson) {
  if (
    typeof metadata.order !== "number" ||
    typeof metadata.name !== "string" ||
    typeof metadata.whatIDid !== "string" ||
    typeof metadata.company !== "string" ||
    typeof metadata.year !== "string"
  ) {
    console.warn(`[works] Skipping "${slug}": project.json has missing or invalid fields`);
    return null;
  }

  return {
    order: metadata.order,
    name: metadata.name,
    whatIDid: metadata.whatIDid,
    company: metadata.company,
    year: metadata.year,
  };
}

function getProjectYear(year: string) {
  const parsedYear = Number.parseInt(year, 10);

  return Number.isFinite(parsedYear) ? parsedYear : 0;
}

function getProjectMedia(slug: string, projectDirectory: string, projectName: string): WorkMedia[] {
  return readdirSync(projectDirectory)
    .filter(isSupportedMedia)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((filename) => {
      const extension = path.extname(filename).toLowerCase();
      const filePath = path.join(projectDirectory, filename);
      const dimensions = imageExtensions.has(extension) ? getImageDimensions(filePath) : null;

      return {
        kind: imageExtensions.has(extension) ? "image" : "video",
        src: `/works/${slug}/${filename}`,
        filename,
        width: dimensions?.width ?? 16,
        height: dimensions?.height ?? 9,
        alt: `${projectName} ${formatFilename(filename)}`,
      };
    });
}
