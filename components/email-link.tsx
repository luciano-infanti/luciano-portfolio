"use client";

import { useEffect, useRef, useState } from "react";

const ENCODED_EMAIL = "bHVjaWFub2luZmFudGkzNjlAZ21haWwuY29t";

export function EmailLink() {
  const [isToastVisible, setIsToastVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const email = atob(ENCODED_EMAIL);

    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = email;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setIsToastVisible(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsToastVisible(false);
    }, 2400);
  };

  return (
    <>
      <button className="email-link" onClick={handleCopy} type="button">
        Email
      </button>
      <div
        aria-live="polite"
        className={isToastVisible ? "copy-toast is-visible" : "copy-toast"}
        role="status"
      >
        Email copied to the clipboard
      </div>
    </>
  );
}
