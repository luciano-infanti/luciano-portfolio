import { ProjectSection } from "@/components/portfolio";
import { SiteHeader } from "@/components/site-header";
// To revert to the classic nav: swap "-v2" off the end of this import.
import { WorkNavigator } from "@/components/work-navigator-v2";
import { profile, projects } from "@/lib/work";

export default function Home() {
  const workNavProjects = projects.map(({ media, name, slug, year }) => {
    const previewImages = media
      .filter((item) => item.kind === "image")
      .map((item) => ({ alt: item.alt, src: item.src }));

    return {
      name,
      previewImages,
      slug,
      year,
    };
  });

  return (
    <main>
      <section className="hero" aria-label="Luciano Infanti portfolio introduction">
        <SiteHeader current="work" />
        <p className="intro-copy">{profile.bio}</p>
      </section>

      <div className="work-list">
        {projects.map((project) => (
          <ProjectSection key={project.slug} project={project} />
        ))}
      </div>

      <footer className="site-footer">
        <p>Thanks for exploring this far.</p>
      </footer>

      <WorkNavigator projects={workNavProjects} />
    </main>
  );
}
