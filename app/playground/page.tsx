import { MediaStack } from "@/components/portfolio";
import { SiteHeader } from "@/components/site-header";
import { playgroundIntro, playgroundItems } from "@/lib/playground";

export default function PlaygroundPage() {
  return (
    <main>
      <section className="hero" aria-label="Luciano Infanti playground introduction">
        <SiteHeader current="playground" />
        <p className="intro-copy">{playgroundIntro}</p>
      </section>

      <div className="playground-list">
        <MediaStack media={playgroundItems} />
      </div>

      <footer className="site-footer">
        <p>Thanks for exploring this far.</p>
      </footer>
    </main>
  );
}
