"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

const blurSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="12" viewBox="0 0 16 12">
  <filter id="b"><feGaussianBlur stdDeviation="3"/></filter>
  <rect width="16" height="12" fill="#f3f3f3"/>
  <rect width="16" height="12" fill="#e4e4e4" opacity=".65" filter="url(#b)"/>
</svg>`;

const fallbackBlur = `data:image/svg+xml,${encodeURIComponent(blurSvg)}`;

export function BlurImage({ className = "", blurDataURL, ...props }: ImageProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <Image
      {...props}
      ref={ref}
      blurDataURL={blurDataURL ?? fallbackBlur}
      className={`${className} ${inView ? "is-visible" : ""}`}
      placeholder="blur"
    />
  );
}
