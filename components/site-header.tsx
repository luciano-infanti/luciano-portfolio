import Link from "next/link";
import { EmailLink } from "@/components/email-link";

type SiteHeaderProps = {
  current: "work" | "playground";
};

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="brand-lockup">
        <p>
          <Link href="/">Luciano Infanti</Link>
        </p>
        <p>
          Senior Designer @{" "}
          <a href="https://www.rain.com/" rel="noopener noreferrer" target="_blank">
            Rain
          </a>
        </p>
      </div>
      {/* Section links (Work / Playground) hidden for now — restore to re-enable.
      <nav aria-label="Sections" className="playground-label">
        {current === "work" ? <span>Work</span> : <Link href="/">Work</Link>}
        {"\n"}
        {current === "playground" ? (
          <span>Playground</span>
        ) : (
          <Link href="/playground">Playground</Link>
        )}
      </nav>
      */}
      <nav aria-label="Primary links" className="social-links">
        <a href="https://savee.com/lucianoinfanti/" rel="noopener noreferrer" target="_blank">
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
    </header>
  );
}
