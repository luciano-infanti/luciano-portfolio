"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

type WorkNavProject = {
  slug: string;
  name: string;
  year: string;
  previewImages: {
    alt: string;
    src: string;
  }[];
};

export function WorkNavigator({ projects }: { projects: WorkNavProject[] }) {
  const [activeSlug, setActiveSlug] = useState(projects[0]?.slug ?? "");
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewSlots, setPreviewSlots] = useState([0, 1, 2]);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const activeSlugRef = useRef(activeSlug);
  const previewDebounceRef = useRef<number | null>(null);

  const queuePreviewSlug = useCallback((slug: string | null) => {
    if (previewDebounceRef.current !== null) {
      window.clearTimeout(previewDebounceRef.current);
      previewDebounceRef.current = null;
    }

    if (slug === null) {
      setPreviewSlug(null);
      return;
    }

    previewDebounceRef.current = window.setTimeout(() => {
      setPreviewSlug(slug);
      previewDebounceRef.current = null;
    }, 80);
  }, []);

  useEffect(
    () => () => {
      if (previewDebounceRef.current !== null) {
        window.clearTimeout(previewDebounceRef.current);
      }
    },
    [],
  );

  const activeIndex = useMemo(
    () => Math.max(0, projects.findIndex((project) => project.slug === activeSlug)),
    [activeSlug, projects],
  );
  const activeProject = projects[activeIndex] ?? projects[0];
  const previewProject = previewSlug
    ? projects.find((project) => project.slug === previewSlug) ?? null
    : null;
  const previewImages = previewProject
    ? getVisiblePreviewImages(previewProject.previewImages, previewSlots)
    : [];

  const scrollToProject = useCallback((slug: string) => {
    const project = document.getElementById(slug);

    if (!project) {
      return;
    }

    window.history.replaceState(null, "", `#${slug}`);
    project.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSlug(slug);
    setIsOpen(false);
  }, []);

  const scrollToFirstFold = useCallback(() => {
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  }, []);

  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewSlug(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setPreviewSlots([0, 1, 2]);
  }, [previewSlug]);

  useEffect(() => {
    if (!projects.length) {
      return;
    }

    let frame = 0;

    const updateActiveProject = () => {
      frame = 0;

      const firstProject = document.getElementById(projects[0].slug);

      if (!firstProject) {
        return;
      }

      const firstRect = firstProject.getBoundingClientRect();
      const shouldShowNav = firstRect.top <= window.innerHeight * 0.86;
      const marker = window.innerHeight * 0.44;
      let nextSlug = projects[0].slug;

      for (const project of projects) {
        const element = document.getElementById(project.slug);

        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();

        if (rect.top <= marker && rect.bottom > marker) {
          nextSlug = project.slug;
          break;
        }

        if (rect.top < marker) {
          nextSlug = project.slug;
        }
      }

      setIsVisible(shouldShowNav);

      if (nextSlug !== activeSlugRef.current) {
        setActiveSlug(nextSlug);
      }
    };

    const requestUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateActiveProject);
    };

    updateActiveProject();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [projects]);

  useEffect(() => {
    if (!labelRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return;
    }

    gsap.fromTo(
      labelRef.current,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.32, ease: "power3.out" },
    );
  }, [activeSlug]);

  useEffect(() => {
    if (!menuRef.current) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      gsap.set(menuRef.current, { autoAlpha: isOpen ? 1 : 0, y: isOpen ? 0 : 8 });
      return;
    }

    gsap.to(menuRef.current, {
      autoAlpha: isOpen ? 1 : 0,
      y: isOpen ? 0 : 8,
      duration: isOpen ? 0.28 : 0.2,
      ease: isOpen ? "power3.out" : "power2.in",
    });
  }, [isOpen]);

  useEffect(() => {
    if (!previewProject) {
      return;
    }

    const imageCount = previewProject.previewImages.length;

    if (!isOpen || imageCount <= 3) {
      return;
    }

    let slotIndex = 0;
    let nextImageIndex = 3;

    const interval = window.setInterval(() => {
      const targetSlot = slotIndex;

      setPreviewSlots((currentSlots) => {
        const nextSlots = [...currentSlots];
        nextSlots[targetSlot] = nextImageIndex % imageCount;
        return nextSlots;
      });

      slotIndex = (slotIndex + 1) % 3;
      nextImageIndex = (nextImageIndex + 1) % imageCount;

      requestAnimationFrame(() => {
        if (!previewRef.current) {
          return;
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }

        const thumb = previewRef.current.querySelectorAll(".work-nav-preview-thumb")[targetSlot];
        const img = thumb?.querySelector("img");

        if (!img) {
          return;
        }

        gsap.fromTo(
          img,
          { opacity: 0.25 },
          { opacity: 1, duration: 0.42, ease: "power2.out" },
        );
      });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [isOpen, previewProject?.previewImages.length, previewSlug]);

  useEffect(() => {
    if (!previewRef.current || !isOpen) {
      return;
    }

    const thumbs = previewRef.current.querySelectorAll(".work-nav-preview-thumb");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      gsap.set(thumbs, { autoAlpha: 1, y: 0 });
      return;
    }

    gsap.killTweensOf(thumbs);
    gsap.fromTo(
      thumbs,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.36,
        ease: "power3.out",
        stagger: 0.06,
        overwrite: "auto",
      },
    );
  }, [isOpen, previewSlug]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!projects.length || !activeProject) {
    return null;
  }

  return (
    <>
      <div className={isVisible ? "work-nav is-visible" : "work-nav"} ref={rootRef}>
        <div
          aria-hidden={!isOpen}
          className={isOpen ? "work-nav-popover is-open" : "work-nav-popover"}
          onPointerLeave={() => queuePreviewSlug(null)}
          ref={menuRef}
        >
          {previewSlug && previewImages.length > 0 ? (
            <div className="work-nav-preview work-nav-preview-fan" ref={previewRef}>
              {previewImages.map((image, index) => (
                <PreviewThumb alt={image.alt} key={index} src={image.src} />
              ))}
            </div>
          ) : null}

          <div className="work-nav-menu" id="work-project-menu">
            {projects.map((project) => (
              <button
                aria-label={`${project.name}, ${project.year}`}
                aria-current={project.slug === activeSlug ? "true" : undefined}
                className="work-nav-menu-item"
                key={project.slug}
                onFocus={() => queuePreviewSlug(project.slug)}
                onPointerEnter={() => queuePreviewSlug(project.slug)}
                onClick={() => scrollToProject(project.slug)}
                type="button"
              >
                <span className="work-nav-menu-name">{project.name}</span>
                <span className="work-nav-menu-year">{project.year}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          aria-controls="work-project-menu"
          aria-expanded={isOpen}
          aria-label={`Select project, current project ${activeProject.name}, ${activeProject.year}`}
          className="work-nav-trigger"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="work-nav-label-wrap" ref={labelRef}>
            <span className="work-nav-label">{activeProject.name}</span>
          </span>
          <span aria-hidden="true" className="work-nav-icon">
            <span />
            <span />
            <span />
          </span>
        </button>

        <button
          aria-label="Back to first fold"
          className="work-back-button"
          onClick={scrollToFirstFold}
          type="button"
        >
          <span aria-hidden="true">↑</span>
        </button>
      </div>
    </>
  );
}

function PreviewThumb({ alt, src }: { alt: string; src: string }) {
  return (
    <figure className="work-nav-preview-thumb">
      <span className="work-nav-preview-image-wrap">
        <img alt={alt} loading="lazy" src={src} />
      </span>
    </figure>
  );
}

function getVisiblePreviewImages(
  images: WorkNavProject["previewImages"],
  slots: number[],
) {
  if (images.length === 0) {
    return [];
  }

  return slots.map((slot) => images[slot % images.length]);
}
