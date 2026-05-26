import { BackToTop } from "@/components/back-to-top";
import { EmailLink } from "@/components/email-link";
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
        <p className="site-footer-message">Thanks for exploring this far.</p>

        <nav aria-label="Contact" className="site-footer-links">
          <a
            href="https://savee.com/lucianoinfanti/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Savee
          </a>
          <a
            href="https://www.linkedin.com/in/luciano-infanti/"
            rel="noopener noreferrer"
            target="_blank"
          >
            LinkedIn
          </a>
          <EmailLink />
        </nav>

        <div className="site-footer-meta">
          <p>São Paulo, Brazil</p>
          <p>© 2026</p>
        </div>
      </footer>

      <BackToTop />
    </main>
  );
}
