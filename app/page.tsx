import { BackToTop } from "@/components/back-to-top";
import { EmailLink } from "@/components/email-link";
import { FlatStream } from "@/components/flat-stream";
import { SiteHeader } from "@/components/site-header";
import { profile, projects } from "@/lib/work";

export default function Home() {
  return (
    <main>
      <section className="hero" aria-label="Luciano Infanti portfolio introduction">
        <SiteHeader current="work" />
        <p className="intro-copy">{profile.bio}</p>
      </section>

      <FlatStream projects={projects} />

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
